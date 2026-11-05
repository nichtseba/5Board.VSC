/**
 * Messages sent over the WebSocket between teacher, server and students.
 *
 * Students can only send values from fixed lists (no free text), so there is nothing
 * to moderate and nobody can post anything offensive.
 * Later this file can move to the `common` package so the extension and the student page
 * share the same types.
 */

export const REACTION_KINDS = ['tooFast', 'tooSlow', 'unclear', 'good', 'panic'] as const;
export type ReactionKind = (typeof REACTION_KINDS)[number];

export const MARK_EMOJIS = ['❓', '😕', '👍', '🔴'] as const;
export type MarkEmoji = (typeof MARK_EMOJIS)[number];

/** How long a reaction counts (seconds). After that the student has to press again. */
export const REACTION_WINDOW_SECONDS = 30;

// Teacher -> server
export type TeacherToServer =
  | {
      type: 'broadcast';
      /** Anything the plugin wants the students to receive (e.g. the messages the projector gets). */
      message: unknown;
      /** If true, students who join later get this message first (e.g. the whole document). */
      remember?: boolean;
    }
  /** Ends the session right away (students get `sessionEnded`). */
  | { type: 'endSession' };

// Student -> server
export type StudentToServer =
  | { type: 'reaction'; kind: ReactionKind }
  /** x and y are between 0 and 1, relative to the board (like the projector cursor). */
  | { type: 'mark'; x: number; y: number; emoji: MarkEmoji };

// Server -> teacher
export type ServerToTeacher =
  | { type: 'ready'; code: string }
  | { type: 'participants'; count: number }
  | {
      type: 'reactionCounts';
      counts: Record<ReactionKind, number>;
      windowSeconds: number;
    }
  | { type: 'mark'; x: number; y: number; emoji: MarkEmoji };

// Server -> student
export type ServerToStudent =
  | { type: 'ready'; code: string }
  | { type: 'board'; message: unknown }
  | { type: 'teacherOffline' }
  | { type: 'teacherBack' }
  | { type: 'sessionEnded' };

export function isReactionKind(value: unknown): value is ReactionKind {
  return typeof value === 'string' && (REACTION_KINDS as readonly string[]).includes(value);
}

export function isMarkEmoji(value: unknown): value is MarkEmoji {
  return typeof value === 'string' && (MARK_EMOJIS as readonly string[]).includes(value);
}

/** Checks a message from a student. Returns null for anything unexpected. */
export function parseStudentMessage(raw: string): StudentToServer | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const msg = data as Record<string, unknown>;

  if (msg.type === 'reaction' && isReactionKind(msg.kind)) {
    return { type: 'reaction', kind: msg.kind };
  }
  if (
    msg.type === 'mark' &&
    isMarkEmoji(msg.emoji) &&
    typeof msg.x === 'number' &&
    typeof msg.y === 'number' &&
    Number.isFinite(msg.x) &&
    Number.isFinite(msg.y)
  ) {
    return {
      type: 'mark',
      x: Math.min(1, Math.max(0, msg.x)),
      y: Math.min(1, Math.max(0, msg.y)),
      emoji: msg.emoji,
    };
  }
  return null;
}

/** Checks a message from the teacher. Returns null for anything unexpected. */
export function parseTeacherMessage(raw: string): TeacherToServer | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const msg = data as Record<string, unknown>;
  if (msg.type === 'broadcast' && 'message' in msg) {
    return { type: 'broadcast', message: msg.message, remember: msg.remember === true };
  }
  if (msg.type === 'endSession') {
    return { type: 'endSession' };
  }
  return null;
}
