import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { WebSocket } from 'ws';
import { startServer, type StartedServer } from './index.js';

let server: StartedServer;
const base = () => `http://127.0.0.1:${server.port}`;
const wsBase = () => `ws://127.0.0.1:${server.port}`;

/** What the tests look at in the messages the server sends. */
type Received = {
  type: string;
  message?: unknown;
  count?: number;
  counts?: Record<string, number>;
};

/** Opens a socket and collects every message it receives. */
function connect(query: string) {
  const socket = new WebSocket(`${wsBase()}/ws?${query}`);
  const messages: Received[] = [];
  socket.on('message', (data) => messages.push(JSON.parse(data.toString()) as Received));
  const opened = new Promise<void>((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });
  const closed = new Promise<number>((resolve) => socket.once('close', (code) => resolve(code)));
  return { socket, messages, opened, closed };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const lastOf = (messages: Received[], type: string) =>
  [...messages].reverse().find((m) => m.type === type);

async function createSession() {
  const res = await fetch(`${base()}/api/sessions`, { method: 'POST' });
  assert.equal(res.status, 201);
  return (await res.json()) as { code: string; teacherToken: string };
}

describe('5Board relay server', () => {
  before(async () => {
    server = await startServer({ port: 0, host: '127.0.0.1' });
  });
  after(async () => {
    await server.close();
  });

  it('creates a session with a 4 character code', async () => {
    const { code, teacherToken } = await createSession();
    assert.match(code, /^[A-Z2-9]{4}$/);
    assert.ok(teacherToken.length >= 32);
  });

  it('rejects unknown codes and wrong teacher tokens', async () => {
    const unknown = connect('code=ZZZZ');
    assert.equal(await unknown.closed, 4004);

    const { code } = await createSession();
    const wrong = connect(`code=${code}&token=nope`);
    assert.equal(await wrong.closed, 4001);
  });

  it('forwards the board to students, also to those who join later', async () => {
    const { code, teacherToken } = await createSession();
    const teacher = connect(`code=${code}&token=${teacherToken}`);
    await teacher.opened;
    const early = connect(`code=${code}`);
    await early.opened;

    teacher.socket.send(
      JSON.stringify({ type: 'broadcast', remember: true, message: { hello: 'board v1' } }),
    );
    await wait(100);
    assert.deepEqual(lastOf(early.messages, 'board')?.message, { hello: 'board v1' });

    const late = connect(`code=${code}`);
    await late.opened;
    await wait(100);
    assert.deepEqual(lastOf(late.messages, 'board')?.message, { hello: 'board v1' });
    teacher.socket.close();
    early.socket.close();
    late.socket.close();
  });

  it('counts people (not clicks) and shows them to the teacher', async () => {
    const { code, teacherToken } = await createSession();
    const teacher = connect(`code=${code}&token=${teacherToken}`);
    await teacher.opened;
    const a = connect(`code=${code}`);
    const b = connect(`code=${code}`);
    await Promise.all([a.opened, b.opened]);

    a.socket.send(JSON.stringify({ type: 'reaction', kind: 'unclear' }));
    b.socket.send(JSON.stringify({ type: 'reaction', kind: 'unclear' }));
    await wait(100);
    assert.equal(lastOf(teacher.messages, 'participants')?.count, 2);
    assert.equal(lastOf(teacher.messages, 'reactionCounts')?.counts?.unclear, 2);

    // Same student again within the rate limit: ignored, still 2 people.
    a.socket.send(JSON.stringify({ type: 'reaction', kind: 'unclear' }));
    await wait(100);
    assert.equal(lastOf(teacher.messages, 'reactionCounts')?.counts?.unclear, 2);

    // A student who leaves no longer counts.
    b.socket.close();
    await wait(100);
    assert.equal(lastOf(teacher.messages, 'reactionCounts')?.counts?.unclear, 1);
    assert.equal(lastOf(teacher.messages, 'participants')?.count, 1);
    teacher.socket.close();
    a.socket.close();
  });

  it('forwards marks anonymously and clamps the position to the board', async () => {
    const { code, teacherToken } = await createSession();
    const teacher = connect(`code=${code}&token=${teacherToken}`);
    await teacher.opened;
    const student = connect(`code=${code}`);
    await student.opened;

    student.socket.send(JSON.stringify({ type: 'mark', x: 0.25, y: 5, emoji: '❓' }));
    await wait(100);
    assert.deepEqual(lastOf(teacher.messages, 'mark'), {
      type: 'mark',
      x: 0.25,
      y: 1,
      emoji: '❓',
    });
    teacher.socket.close();
    student.socket.close();
  });

  it('ignores free text, unknown values and oversized messages from students', async () => {
    const { code, teacherToken } = await createSession();
    const teacher = connect(`code=${code}&token=${teacherToken}`);
    await teacher.opened;
    const student = connect(`code=${code}`);
    await student.opened;

    student.socket.send(JSON.stringify({ type: 'mark', x: 0.5, y: 0.5, emoji: 'rude words' }));
    student.socket.send(JSON.stringify({ type: 'reaction', kind: 'hack' }));
    student.socket.send(JSON.stringify({ type: 'broadcast', message: 'I am the teacher' }));
    student.socket.send('x'.repeat(5000));
    student.socket.send('not json');
    await wait(150);
    assert.equal(lastOf(teacher.messages, 'mark'), undefined);
    assert.equal(lastOf(teacher.messages, 'reactionCounts'), undefined);
    teacher.socket.close();
    student.socket.close();
  });

  it('ends the session for everybody when the teacher asks for it', async () => {
    const { code, teacherToken } = await createSession();
    const teacher = connect(`code=${code}&token=${teacherToken}`);
    await teacher.opened;
    const student = connect(`code=${code}`);
    await student.opened;

    teacher.socket.send(JSON.stringify({ type: 'endSession' }));
    assert.equal(await student.closed, 1000);
    assert.ok(lastOf(student.messages, 'sessionEnded'));
    assert.equal(server.store.get(code), undefined);

    // Nobody can join an ended session anymore.
    assert.equal(await connect(`code=${code}`).closed, 4004);
  });

  it('tells students when the teacher goes offline and comes back', async () => {
    const { code, teacherToken } = await createSession();
    const teacher = connect(`code=${code}&token=${teacherToken}`);
    await teacher.opened;
    const student = connect(`code=${code}`);
    await student.opened;

    teacher.socket.close();
    await wait(150);
    assert.ok(lastOf(student.messages, 'teacherOffline'));

    const back = connect(`code=${code}&token=${teacherToken}`);
    await back.opened;
    await wait(150);
    assert.ok(lastOf(student.messages, 'teacherBack'));
    back.socket.close();
    student.socket.close();
  });
});
