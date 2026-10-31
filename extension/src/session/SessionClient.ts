import * as vscode from 'vscode';
import WebSocket from 'ws';
import { parseServerToTeacher, type ServerToTeacher } from '5board.vsc-common';

export type SessionState = 'idle' | 'connecting' | 'connected' | 'reconnecting';

/** Why a running session ended without the teacher asking for it. */
export type SessionEndReason = 'serverClosed' | 'connectionLost';

export class InvalidServerUrlError extends Error {}
export class SessionStartError extends Error {}

const REQUEST_TIMEOUT_MS = 5000;
/** Keeps the connection open through proxies that drop idle connections. */
const PING_INTERVAL_MS = 25_000;
const RECONNECT_MAX_DELAY_MS = 10_000;
/** The server keeps a session alive this long without a teacher (see server/src/sessions.ts). */
const RECONNECT_GIVE_UP_MS = 10 * 60 * 1000;
/**
 * Close codes with which the server says "this session is over":
 * 1000 session ended, 4000 replaced by another connection, 4001 wrong token,
 * 4003 session full, 4004 unknown session. Reconnecting would not help.
 */
const FINAL_CLOSE_CODES = new Set([1000, 4000, 4001, 4003, 4004]);

type ActiveSession = {
  code: string;
  token: string;
  baseUrl: string;
  /** Number of reconnect attempts since the last successful connection. */
  attempt: number;
  /** When the connection was lost, or null while connected. */
  lostSince: number | null;
};

/** Turns `http://localhost:3000/` into `http://localhost:3000`, rejects anything that is no http(s) URL. */
export function normalizeServerUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new InvalidServerUrlError(input);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new InvalidServerUrlError(input);
  }
  return url.origin + url.pathname.replace(/\/+$/, '');
}

/**
 * Connection of the teacher to the live server.
 *
 * `start` creates a session and connects. If the connection drops, it reconnects on its own
 * for up to ten minutes (the server keeps the session that long). Everything the server sends
 * is passed on through `onDidReceive`.
 */
export class SessionClient implements vscode.Disposable {
  private readonly stateEmitter = new vscode.EventEmitter<SessionState>();
  private readonly messageEmitter = new vscode.EventEmitter<ServerToTeacher>();
  private readonly endEmitter = new vscode.EventEmitter<SessionEndReason>();

  public readonly onDidChangeState = this.stateEmitter.event;
  public readonly onDidReceive = this.messageEmitter.event;
  public readonly onDidEnd = this.endEmitter.event;

  private current: ActiveSession | null = null;
  private socket: WebSocket | null = null;
  private pingTimer: NodeJS.Timeout | undefined;
  private reconnectTimer: NodeJS.Timeout | undefined;
  private currentState: SessionState = 'idle';

  public get state(): SessionState {
    return this.currentState;
  }

  /** The code the students enter, or null without a session. */
  public get code(): string | null {
    return this.current?.code ?? null;
  }

  /**
   * Creates a session on the server and connects to it. Resolves with the session code.
   * Throws {@link InvalidServerUrlError} for a bad address, otherwise the connection error.
   */
  public async start(serverUrl: string): Promise<string> {
    if (this.currentState !== 'idle') {
      throw new Error('A session is already running');
    }
    const baseUrl = normalizeServerUrl(serverUrl);
    this.setState('connecting');
    try {
      const { code, token } = await createSession(baseUrl);
      const session: ActiveSession = { code, token, baseUrl, attempt: 0, lostSince: null };
      this.current = session;
      await this.openSocket(session);
      return code;
    } catch (error) {
      this.reset();
      throw error;
    }
  }

  /** Ends the session for everybody: the server tells the students that it is over. */
  public stop(): void {
    // Without this the server keeps the session for a while in case the teacher comes back.
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'endSession' }));
    }
    this.reset();
  }

  public dispose(): void {
    this.stop();
    this.stateEmitter.dispose();
    this.messageEmitter.dispose();
    this.endEmitter.dispose();
  }

  private openSocket(session: ActiveSession): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = new URLSearchParams({ code: session.code, token: session.token });
      const socket = new WebSocket(`${session.baseUrl.replace(/^http/, 'ws')}/ws?${query}`, {
        handshakeTimeout: REQUEST_TIMEOUT_MS,
      });
      let opened = false;

      socket.on('open', () => {
        opened = true;
        this.socket = socket;
        this.startPing(socket);
        resolve();
      });
      socket.on('message', (data, isBinary) => {
        if (!isBinary) this.handleMessage(session, data.toString());
      });
      // An error is always followed by 'close', so it is only needed to reject the promise.
      socket.on('error', (error) => {
        if (!opened) reject(error);
      });
      socket.on('close', (code) => {
        this.stopPing();
        if (this.socket === socket) this.socket = null;
        if (!opened) {
          reject(new SessionStartError(`Connection closed (${code})`));
          return;
        }
        this.handleClose(session, code);
      });
    });
  }

  private handleMessage(session: ActiveSession, raw: string): void {
    if (this.current !== session) return;
    const message = parseServerToTeacher(raw);
    if (!message) return;
    if (message.type === 'ready') {
      session.attempt = 0;
      session.lostSince = null;
      this.setState('connected');
    }
    this.messageEmitter.fire(message);
  }

  private handleClose(session: ActiveSession, code: number): void {
    // Stopped or replaced in the meantime: nothing to do.
    if (this.current !== session) return;
    if (FINAL_CLOSE_CODES.has(code)) {
      this.end('serverClosed');
      return;
    }
    this.scheduleReconnect(session);
  }

  private scheduleReconnect(session: ActiveSession): void {
    session.lostSince ??= Date.now();
    if (Date.now() - session.lostSince > RECONNECT_GIVE_UP_MS) {
      this.end('connectionLost');
      return;
    }
    this.setState('reconnecting');
    const delay = Math.min(1000 * 2 ** session.attempt, RECONNECT_MAX_DELAY_MS);
    session.attempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      if (this.current !== session) return;
      this.openSocket(session).catch(() => {
        if (this.current === session) this.scheduleReconnect(session);
      });
    }, delay);
  }

  private end(reason: SessionEndReason): void {
    this.reset();
    this.endEmitter.fire(reason);
  }

  private reset(): void {
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    const socket = this.socket;
    this.socket = null;
    this.current = null;
    socket?.close(1000);
    this.setState('idle');
  }

  private startPing(socket: WebSocket): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) socket.ping();
    }, PING_INTERVAL_MS);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = undefined;
    }
  }

  private setState(state: SessionState): void {
    if (this.currentState === state) return;
    this.currentState = state;
    this.stateEmitter.fire(state);
  }
}

async function createSession(baseUrl: string): Promise<{ code: string; token: string }> {
  const response = await fetch(`${baseUrl}/api/sessions`, {
    method: 'POST',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new SessionStartError(`The server answered with status ${response.status}`);
  }
  const body: unknown = await response.json();
  const { code, teacherToken } = (body ?? {}) as Record<string, unknown>;
  if (typeof code !== 'string' || typeof teacherToken !== 'string') {
    throw new SessionStartError('Unexpected answer from the server');
  }
  return { code, token: teacherToken };
}
