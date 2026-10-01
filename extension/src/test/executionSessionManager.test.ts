import { strict as assert } from 'assert';
import {
  ExecutionSessionManager,
  MAX_OUTPUT_CHARS,
  type ExecutionStarter,
  type SessionEvent,
} from '../runner/ExecutionSessionManager';
import type {
  BoardDocument,
  CodeblockSession,
  ExecutionEvent,
  ExecutionStartResult,
} from '5board.vsc-common';

/** A process stand-in: nothing is spawned, the test decides what the "program" does. */
class FakeSession implements CodeblockSession {
  public readonly written: string[] = [];
  public killed = false;
  public inputEnded = false;
  private readonly listeners = new Set<(event: ExecutionEvent) => void>();

  write(text: string): void {
    this.written.push(text);
  }

  endInput(): void {
    this.inputEnded = true;
  }

  kill(): void {
    if (this.killed) return;
    this.killed = true;
    // A killed process still reports its exit, exactly like a real one.
    this.emit({ kind: 'exited', exitCode: null, success: false });
  }

  onEvent(listener: (event: ExecutionEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: ExecutionEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }
}

class FakeStarter implements ExecutionStarter {
  public readonly sessions: FakeSession[] = [];
  public failure: { error: string; stderr?: string } | null = null;

  async start(): Promise<ExecutionStartResult> {
    if (this.failure) {
      return { ok: false, ...this.failure };
    }
    const session = new FakeSession();
    this.sessions.push(session);
    return { ok: true, session };
  }
}

const document = {} as BoardDocument;

function setup() {
  const events: { elementId: string; event: SessionEvent }[] = [];
  const starter = new FakeStarter();
  const manager = new ExecutionSessionManager(
    (elementId, event) => events.push({ elementId, event }),
    starter,
  );
  return { events, starter, manager };
}

function exitEvent(events: { event: SessionEvent }[]) {
  const exited = events.map((e) => e.event).find((event) => event.kind === 'exited');
  assert.ok(exited, 'expected an exit event');
  return exited;
}

describe('ExecutionSessionManager', function () {
  it('keeps output, errors and input in the order they happened', async function () {
    const { events, starter, manager } = setup();
    await manager.start(document, 'a');
    const session = starter.sessions[0];

    session.emit({ kind: 'out', text: 'Name: ' });
    manager.input('a', 'Leon\n');
    session.emit({ kind: 'out', text: 'Hello Leon\n' });
    session.emit({ kind: 'err', text: 'a warning\n' });
    session.emit({ kind: 'exited', exitCode: 0, success: true });

    assert.deepEqual(exitEvent(events).transcript, [
      { kind: 'out', text: 'Name: ' },
      { kind: 'in', text: 'Leon\n' },
      { kind: 'out', text: 'Hello Leon\n' },
      { kind: 'err', text: 'a warning\n' },
    ]);
  });

  it('merges neighbouring chunks of the same kind', async function () {
    const { events, starter, manager } = setup();
    await manager.start(document, 'a');
    const session = starter.sessions[0];

    session.emit({ kind: 'out', text: 'one ' });
    session.emit({ kind: 'out', text: 'two ' });
    session.emit({ kind: 'out', text: 'three' });
    session.emit({ kind: 'exited', exitCode: 0, success: true });

    assert.deepEqual(exitEvent(events).transcript, [{ kind: 'out', text: 'one two three' }]);
  });

  it('writes input to the process and echoes it into the transcript', async function () {
    const { events, starter, manager } = setup();
    await manager.start(document, 'a');
    const session = starter.sessions[0];

    manager.input('a', 'Leon\n');

    assert.deepEqual(session.written, ['Leon\n']);
    const chunk = events.map((e) => e.event).find((event) => event.kind === 'segment');
    assert.deepEqual(chunk?.segment, { kind: 'in', text: 'Leon\n' });
  });

  it('kills the previous process when the same block is started again', async function () {
    const { events, starter, manager } = setup();
    await manager.start(document, 'a');
    await manager.start(document, 'a');

    assert.equal(starter.sessions.length, 2);
    assert.equal(starter.sessions[0].killed, true);
    assert.equal(starter.sessions[1].killed, false);
    // The replaced run is discarded silently: reporting its exit would clear the new run's
    // transcript in the webview.
    assert.equal(
      events.filter((e) => e.event.kind === 'exited').length,
      0,
      'a replaced run must not report an exit',
    );
  });

  it('runs two blocks independently', async function () {
    const { events, starter, manager } = setup();
    await manager.start(document, 'a');
    await manager.start(document, 'b');

    starter.sessions[0].emit({ kind: 'out', text: 'from a' });
    starter.sessions[1].emit({ kind: 'out', text: 'from b' });
    starter.sessions[1].emit({ kind: 'exited', exitCode: 0, success: true });

    assert.equal(manager.isRunning('a'), true);
    assert.equal(manager.isRunning('b'), false);

    const exited = events.find((e) => e.event.kind === 'exited');
    assert.equal(exited?.elementId, 'b');
    assert.deepEqual(exited?.event.kind === 'exited' ? exited.event.transcript : null, [
      { kind: 'out', text: 'from b' },
    ]);
  });

  it('stops a program that floods the output and marks the transcript truncated', async function () {
    const { events, starter, manager } = setup();
    await manager.start(document, 'a');
    const session = starter.sessions[0];

    session.emit({ kind: 'out', text: 'x'.repeat(MAX_OUTPUT_CHARS + 1) });

    assert.equal(session.killed, true);
    const exited = exitEvent(events);
    assert.equal(exited.kind === 'exited' && exited.truncated, true);
    assert.equal(exited.kind === 'exited' && exited.success, false);
    assert.equal(exited.kind === 'exited' && exited.transcript.at(-1)?.kind, 'system');
    assert.equal(manager.isRunning('a'), false);
  });

  it('reports a failed start as an error transcript instead of a session', async function () {
    const { events, starter, manager } = setup();
    starter.failure = { error: 'Compilation failed.', stderr: 'Foo.java:1: error: ;expected' };

    await manager.start(document, 'a');

    const exited = exitEvent(events);
    assert.deepEqual(exited.kind === 'exited' && exited.transcript, [
      { kind: 'err', text: 'Foo.java:1: error: ;expected' },
    ]);
    assert.equal(exited.kind === 'exited' && exited.success, false);
    assert.equal(manager.isRunning('a'), false);
  });

  it('reports a start that failed before compiling as a system message', async function () {
    const { events, starter, manager } = setup();
    starter.failure = { error: 'No JDK 25+ found.' };

    await manager.start(document, 'a');

    const exited = exitEvent(events);
    assert.deepEqual(exited.kind === 'exited' && exited.transcript, [
      { kind: 'system', text: 'No JDK 25+ found.' },
    ]);
  });

  it('stops every process when the document goes away', async function () {
    const { starter, manager } = setup();
    await manager.start(document, 'a');
    await manager.start(document, 'b');

    manager.stopAll();

    assert.ok(starter.sessions.every((session) => session.killed));
    assert.equal(manager.isRunning('a'), false);
    assert.equal(manager.isRunning('b'), false);
  });

  it('ignores input, EOF and stop for blocks that are not running', function () {
    const { manager } = setup();
    assert.doesNotThrow(() => {
      manager.input('nobody', 'text\n');
      manager.endInput('nobody');
      manager.stop('nobody');
    });
  });

  it('keeps the program running after its transcript is cleared and reports only what followed', async function () {
    const { events, starter, manager } = setup();
    await manager.start(document, 'a');
    const session = starter.sessions[0];

    session.emit({ kind: 'out', text: 'before\n' });
    manager.clearTranscript('a');

    assert.equal(session.killed, false);
    assert.equal(manager.isRunning('a'), true);

    session.emit({ kind: 'out', text: 'after\n' });
    session.emit({ kind: 'exited', exitCode: 0, success: true });

    assert.deepEqual(exitEvent(events).transcript, [{ kind: 'out', text: 'after\n' }]);
  });

  it('counts the output limit from the clear on', async function () {
    const { starter, manager } = setup();
    await manager.start(document, 'a');
    const session = starter.sessions[0];

    session.emit({ kind: 'out', text: 'x'.repeat(MAX_OUTPUT_CHARS - 10) });
    manager.clearTranscript('a');
    session.emit({ kind: 'out', text: 'x'.repeat(100) });

    assert.equal(session.killed, false);
  });

  it('treats a block as active while it is still compiling', async function () {
    const { manager } = setup();
    const starting = manager.start(document, 'a');

    assert.equal(manager.isActive('a'), true);
    assert.equal(manager.isRunning('a'), false);
    assert.deepEqual(manager.activeBlockIds(), ['a']);

    await starting;
    assert.equal(manager.isActive('a'), true);
    assert.equal(manager.isRunning('a'), true);
  });

  it('is no longer active once a failed start has been reported', async function () {
    const { starter, manager } = setup();
    starter.failure = { error: 'Compilation failed.' };

    await manager.start(document, 'a');

    assert.equal(manager.isActive('a'), false);
    assert.deepEqual(manager.activeBlockIds(), []);
  });

  it('passes end of input on to the running process', async function () {
    const { starter, manager } = setup();
    await manager.start(document, 'a');

    manager.endInput('a');

    assert.equal(starter.sessions[0].inputEnded, true);
  });
});
