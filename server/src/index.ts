import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { WebSocketServer } from 'ws';
import { SessionStore } from './sessions.js';

/** The teacher sends the whole board (with images) once, so this is generous. */
const MAX_WS_PAYLOAD_BYTES = 20 * 1024 * 1024;

export type StartedServer = {
  port: number;
  store: SessionStore;
  close: () => Promise<void>;
};

/**
 * Starts the relay server.
 *
 * - POST /api/sessions        teacher creates a session -> { code, teacherToken }
 * - GET  /health              for monitoring
 * - GET  /demo                test page (two browser tabs: one teacher, one student)
 * - WS   /ws?code=K7F2        student joins
 * - WS   /ws?code=K7F2&token= teacher connects to his own session
 *
 * If TEACHER_SECRET is set, creating a session needs the header `x-teacher-secret`.
 * Use this as soon as the server is reachable from the internet.
 *
 * `publicDir` is the folder with `demo.html` (default: `public` in the working directory).
 * Without `host` the server listens on all network interfaces.
 */
export async function startServer(options: {
  port?: number;
  host?: string;
  teacherSecret?: string;
  publicDir?: string;
}): Promise<StartedServer> {
  const store = new SessionStore();
  const teacherSecret = options.teacherSecret;
  const publicDir = options.publicDir ?? path.join(process.cwd(), 'public');

  const http: Server = createServer((req, res) => {
    handleHttp(req, res, store, teacherSecret, publicDir).catch(() => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
  });

  const wss = new WebSocketServer({ server: http, path: '/ws', maxPayload: MAX_WS_PAYLOAD_BYTES });
  wss.on('connection', (socket, req) => {
    const url = new URL(req.url ?? '', 'http://localhost');
    const session = store.get(url.searchParams.get('code') ?? '');
    if (!session) {
      socket.close(4004, 'unknown session');
      return;
    }
    const token = url.searchParams.get('token');
    if (token !== null) {
      if (!safeEqual(token, session.teacherToken)) {
        socket.close(4001, 'wrong token');
        return;
      }
      session.attachTeacher(socket);
    } else if (!session.attachStudent(socket)) {
      socket.close(4003, 'session full');
    }
  });

  // Hosting programs (e.g. Passenger) hook into `listen(port, callback)`, so the host is only
  // passed on when somebody really asked for one (the tests use 127.0.0.1).
  await new Promise<void>((resolve) => {
    const port = options.port ?? 3000;
    if (options.host) {
      http.listen(port, options.host, resolve);
    } else {
      http.listen(port, resolve);
    }
  });
  const address = http.address();
  const port = typeof address === 'object' && address ? address.port : (options.port ?? 3000);

  return {
    port,
    store,
    close: async () => {
      store.closeAll();
      for (const client of wss.clients) client.terminate();
      wss.close();
      await new Promise<void>((resolve) => http.close(() => resolve()));
    },
  };
}

async function handleHttp(
  req: IncomingMessage,
  res: ServerResponse,
  store: SessionStore,
  teacherSecret: string | undefined,
  publicDir: string,
): Promise<void> {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');

  if (req.method === 'GET' && pathname === '/health') {
    json(res, 200, { ok: true, sessions: store.size });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/sessions') {
    if (teacherSecret) {
      const given = req.headers['x-teacher-secret'];
      if (typeof given !== 'string' || !safeEqual(given, teacherSecret)) {
        json(res, 401, { error: 'wrong teacher secret' });
        return;
      }
    }
    const session = store.create();
    if (!session) {
      json(res, 503, { error: 'too many sessions' });
      return;
    }
    json(res, 201, { code: session.code, teacherToken: session.teacherToken });
    return;
  }

  if (req.method === 'GET' && (pathname === '/demo' || pathname === '/')) {
    const html = await readFile(path.join(publicDir, 'demo.html'));
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  json(res, 404, { error: 'not found' });
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
