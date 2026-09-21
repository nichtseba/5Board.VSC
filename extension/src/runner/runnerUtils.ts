import { spawn } from 'child_process';
import { StringDecoder } from 'string_decoder';
import type { CodeblockSession, ExecutionEvent } from '5board.vsc-common';

export interface CommandResult {
  stdout: string;
  stderr: string;
  status: number | null;
  timedOut?: boolean;
  /** Set when the process could not be started at all. */
  error?: string;
}

export function runCommand(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs = 30_000,
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { cwd });
    const stdout = new StringDecoder('utf8');
    const stderr = new StringDecoder('utf8');
    let out = '';
    let err = '';
    let settled = false;

    const finish = (status: number | null, extra: Partial<CommandResult> = {}) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout: out + stdout.end(), stderr: err + stderr.end(), status, ...extra });
    };

    const timer = setTimeout(() => {
      proc.kill();
      finish(null, { timedOut: true });
    }, timeoutMs);

    proc.stdout.on('data', (chunk: Buffer) => (out += stdout.write(chunk)));
    proc.stderr.on('data', (chunk: Buffer) => (err += stderr.write(chunk)));
    proc.on('close', (code) => finish(code));
    proc.on('error', (error) => finish(null, { error: error.message }));
  });
}

export interface ProcessHandle {
  write(text: string): void;
  endInput(): void;
  kill(): void;
  onData(listener: (stream: 'out' | 'err', text: string) => void): void;
  onExit(listener: (code: number | null) => void): void;
}

/**
 * Spawns a process and streams its output. No timeout on purpose: an interactive program
 * legitimately idles while it waits for input; `ExecutionSessionManager` stops it.
 */
export function startProcess(command: string, args: string[], cwd: string): ProcessHandle {
  const proc = spawn(command, args, { cwd });

  const dataListeners: ((stream: 'out' | 'err', text: string) => void)[] = [];
  const exitListeners: ((code: number | null) => void)[] = [];
  let exited = false;

  // One decoder per stream: a multi-byte character can be split across two chunks.
  const attach = (stream: NodeJS.ReadableStream, kind: 'out' | 'err') => {
    const decoder = new StringDecoder('utf8');
    const emit = (text: string) => {
      if (text) dataListeners.forEach((listener) => listener(kind, text));
    };
    stream.on('data', (chunk: Buffer) => emit(decoder.write(chunk)));
    stream.on('end', () => emit(decoder.end()));
  };

  attach(proc.stdout, 'out');
  attach(proc.stderr, 'err');

  // Writing to a program that closed its stdin raises EPIPE, which would crash the extension host.
  proc.stdin.on('error', () => {});

  const finish = (code: number | null) => {
    if (exited) return;
    exited = true;
    exitListeners.forEach((listener) => listener(code));
  };

  proc.on('close', (code) => finish(code));
  proc.on('error', () => finish(null));

  return {
    write(text) {
      if (!exited) proc.stdin.write(text, 'utf8');
    },
    endInput() {
      if (!exited) proc.stdin.end();
    },
    kill() {
      if (!exited) proc.kill();
    },
    onData(listener) {
      dataListeners.push(listener);
    },
    onExit(listener) {
      exitListeners.push(listener);
    },
  };
}

/** Adapts a {@link ProcessHandle} to the language-neutral session interface. */
export class ProcessSession implements CodeblockSession {
  private readonly listeners = new Set<(event: ExecutionEvent) => void>();

  constructor(private readonly process: ProcessHandle) {
    this.process.onData((stream, text) => this.emit({ kind: stream, text }));
    this.process.onExit((code) =>
      this.emit({ kind: 'exited', exitCode: code, success: code === 0 }),
    );
  }

  write(text: string): void {
    this.process.write(text);
  }

  endInput(): void {
    this.process.endInput();
  }

  kill(): void {
    this.process.kill();
  }

  onEvent(listener: (event: ExecutionEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: ExecutionEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }
}
