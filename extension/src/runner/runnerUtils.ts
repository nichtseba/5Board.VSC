import { spawn } from 'child_process';
import { StringDecoder } from 'string_decoder';

export interface CommandResult {
  stdout: string;
  stderr: string;
  status: number | null;
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
    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (status: number | null, error?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout, stderr, status, error });
    };

    const timer = setTimeout(() => {
      proc.kill();
      finish(null, `Command timed out after ${timeoutMs}ms`);
    }, timeoutMs);

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on('close', (code) => finish(code, undefined));
    proc.on('error', (err) => finish(null, err.message));
  });
}

/**
 * A process that is still running. Unlike {@link runCommand} this hands the caller stdin and a
 * kill switch, which is what lets a code block read console input while it executes.
 */
export interface ProcessHandle {
  write(text: string): void;
  /** Closes stdin. Programs looping until EOF stop here. */
  endInput(): void;
  kill(): void;
  onData(listener: (stream: 'out' | 'err', text: string) => void): void;
  onExit(listener: (code: number | null) => void): void;
}

/**
 * Spawns a process and streams its output instead of collecting it.
 *
 * Deliberately has no timeout: an interactive program legitimately sits idle while it waits for
 * the user to type. Callers are responsible for stopping it (see `ExecutionSessionManager`).
 */
export function startProcess(command: string, args: string[], cwd: string): ProcessHandle {
  const proc = spawn(command, args, { cwd });

  const dataListeners: ((stream: 'out' | 'err', text: string) => void)[] = [];
  const exitListeners: ((code: number | null) => void)[] = [];
  let exited = false;

  // One decoder per stream: a multi-byte character can be split across two chunks, and
  // decoding each chunk on its own would turn it into replacement characters.
  const attach = (stream: NodeJS.ReadableStream, kind: 'out' | 'err') => {
    const decoder = new StringDecoder('utf8');
    stream.on('data', (chunk: Buffer) => {
      const text = decoder.write(chunk);
      if (text) {
        dataListeners.forEach((listener) => listener(kind, text));
      }
    });
    stream.on('end', () => {
      const rest = decoder.end();
      if (rest) {
        dataListeners.forEach((listener) => listener(kind, rest));
      }
    });
  };

  attach(proc.stdout, 'out');
  attach(proc.stderr, 'err');

  // A program that closed its own stdin turns every further write into an EPIPE error event.
  // Unhandled, that would take the extension host down for something the user cannot control.
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
      if (exited) return;
      proc.stdin.write(text, 'utf8');
    },
    endInput() {
      if (exited) return;
      proc.stdin.end();
    },
    kill() {
      if (exited) return;
      proc.kill();
    },
    onData(listener) {
      dataListeners.push(listener);
    },
    onExit(listener) {
      exitListeners.push(listener);
    },
  };
}

export { indentCode as indent } from '5board.vsc-common';
