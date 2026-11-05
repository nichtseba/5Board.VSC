import { randomBytes, randomInt } from 'node:crypto';
import type { WebSocket } from 'ws';
import {
  REACTION_KINDS,
  REACTION_WINDOW_SECONDS,
  parseStudentMessage,
  parseTeacherMessage,
  type ReactionKind,
  type ServerToStudent,
  type ServerToTeacher,
} from './protocol.js';

// No 0/O or 1/I so the code is easy to read out loud and type on a phone.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 4;

export const MAX_SESSIONS = 50;
export const MAX_STUDENTS_PER_SESSION = 500;
/** Students may only send tiny messages (a reaction is ~40 bytes). */
const MAX_STUDENT_MESSAGE_BYTES = 512;
const MIN_MS_BETWEEN_REACTIONS = 500;
const MIN_MS_BETWEEN_MARKS = 1000;
/** After the teacher disconnects the session stays alive this long (so a reload is not fatal). */
const TEACHER_GRACE_MS = 10 * 60 * 1000;

type StudentState = {
  /** When each reaction was last pressed (ms). Used to count people, not clicks. */
  reactions: Map<ReactionKind, number>;
  lastReactionAt: number;
  lastMarkAt: number;
};

export class Session {
  public teacher: WebSocket | null = null;
  public readonly students = new Map<WebSocket, StudentState>();
  /** Last message the teacher marked with `remember`, sent to students who join later. */
  private snapshot: string | null = null;
  private lastCountsJson = '';
  private graceTimer: NodeJS.Timeout | null = null;

  constructor(
    public readonly code: string,
    public readonly teacherToken: string,
    private readonly onEmpty: (code: string) => void,
  ) {}

  // ---------- teacher ----------

  public attachTeacher(socket: WebSocket): void {
    // A second teacher connection (e.g. reload) replaces the old one.
    this.teacher?.close(4000, 'replaced');
    this.teacher = socket;
    if (this.graceTimer) {
      clearTimeout(this.graceTimer);
      this.graceTimer = null;
    }
    this.sendToTeacher({ type: 'ready', code: this.code });
    this.sendToTeacher({ type: 'participants', count: this.students.size });
    this.broadcastToStudents({ type: 'teacherBack' });

    socket.on('message', (data, isBinary) => {
      if (isBinary) return;
      const msg = parseTeacherMessage(data.toString());
      if (!msg) return;
      if (msg.type === 'endSession') {
        this.end();
        return;
      }
      const outgoing = JSON.stringify({ type: 'board', message: msg.message });
      if (msg.remember) this.snapshot = outgoing;
      for (const student of this.students.keys()) send(student, outgoing);
    });

    socket.on('close', () => {
      if (this.teacher !== socket) return; // already replaced
      this.teacher = null;
      this.broadcastToStudents({ type: 'teacherOffline' });
      this.graceTimer = setTimeout(() => this.end(), TEACHER_GRACE_MS);
    });
  }

  // ---------- students ----------

  public attachStudent(socket: WebSocket): boolean {
    if (this.students.size >= MAX_STUDENTS_PER_SESSION) return false;
    this.students.set(socket, { reactions: new Map(), lastReactionAt: 0, lastMarkAt: 0 });
    send(socket, JSON.stringify({ type: 'ready', code: this.code } satisfies ServerToStudent));
    if (this.snapshot) send(socket, this.snapshot);
    if (!this.teacher) send(socket, JSON.stringify({ type: 'teacherOffline' }));
    this.sendToTeacher({ type: 'participants', count: this.students.size });

    socket.on('message', (data, isBinary) => {
      if (isBinary) return;
      const text = data.toString();
      if (Buffer.byteLength(text) > MAX_STUDENT_MESSAGE_BYTES) return;
      const msg = parseStudentMessage(text);
      const state = this.students.get(socket);
      if (!msg || !state) return;
      const now = Date.now();

      if (msg.type === 'reaction') {
        if (now - state.lastReactionAt < MIN_MS_BETWEEN_REACTIONS) return;
        state.lastReactionAt = now;
        state.reactions.set(msg.kind, now);
        this.sendCountsIfChanged();
      } else {
        if (now - state.lastMarkAt < MIN_MS_BETWEEN_MARKS) return;
        state.lastMarkAt = now;
        // Anonymous: the teacher gets the mark, but nothing about who sent it.
        this.sendToTeacher({ type: 'mark', x: msg.x, y: msg.y, emoji: msg.emoji });
      }
    });

    socket.on('close', () => {
      this.students.delete(socket);
      this.sendToTeacher({ type: 'participants', count: this.students.size });
      this.sendCountsIfChanged();
    });
    return true;
  }

  // ---------- reactions ----------

  /** Number of different students per reaction within the last REACTION_WINDOW_SECONDS. */
  public countReactions(now = Date.now()): Record<ReactionKind, number> {
    const counts = Object.fromEntries(REACTION_KINDS.map((kind) => [kind, 0])) as Record<
      ReactionKind,
      number
    >;
    const oldest = now - REACTION_WINDOW_SECONDS * 1000;
    for (const student of this.students.values()) {
      for (const [kind, at] of student.reactions) {
        if (at >= oldest) counts[kind] += 1;
        else student.reactions.delete(kind);
      }
    }
    return counts;
  }

  /** Called every second (reactions expire) and after every reaction. */
  public sendCountsIfChanged(): void {
    const message: ServerToTeacher = {
      type: 'reactionCounts',
      counts: this.countReactions(),
      windowSeconds: REACTION_WINDOW_SECONDS,
    };
    const json = JSON.stringify(message);
    if (json === this.lastCountsJson) return;
    this.lastCountsJson = json;
    if (this.teacher) send(this.teacher, json);
  }

  // ---------- helpers ----------

  private sendToTeacher(message: ServerToTeacher): void {
    if (this.teacher) send(this.teacher, JSON.stringify(message));
  }

  private broadcastToStudents(message: ServerToStudent): void {
    const json = JSON.stringify(message);
    for (const student of this.students.keys()) send(student, json);
  }

  public end(): void {
    if (this.graceTimer) clearTimeout(this.graceTimer);
    this.broadcastToStudents({ type: 'sessionEnded' });
    for (const student of this.students.keys()) student.close(1000, 'session ended');
    this.students.clear();
    this.teacher?.close(1000, 'session ended');
    this.teacher = null;
    this.onEmpty(this.code);
  }
}

function send(socket: WebSocket, json: string): void {
  if (socket.readyState === socket.OPEN) socket.send(json);
}

export class SessionStore {
  private sessions = new Map<string, Session>();
  private ticker: NodeJS.Timeout;

  constructor() {
    // Reactions expire on their own, so the teacher's numbers need a regular refresh.
    this.ticker = setInterval(() => {
      for (const session of this.sessions.values()) session.sendCountsIfChanged();
    }, 1000);
    this.ticker.unref();
  }

  public get size(): number {
    return this.sessions.size;
  }

  public create(): Session | null {
    if (this.sessions.size >= MAX_SESSIONS) return null;
    let code: string;
    do {
      code = Array.from({ length: CODE_LENGTH }, () =>
        CODE_ALPHABET.charAt(randomInt(CODE_ALPHABET.length)),
      ).join('');
    } while (this.sessions.has(code));
    const session = new Session(code, randomBytes(24).toString('hex'), (c) =>
      this.sessions.delete(c),
    );
    this.sessions.set(code, session);
    return session;
  }

  public get(code: string): Session | undefined {
    return this.sessions.get(code.toUpperCase());
  }

  public closeAll(): void {
    clearInterval(this.ticker);
    for (const session of [...this.sessions.values()]) session.end();
  }
}
