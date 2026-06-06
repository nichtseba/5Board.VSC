import { spawn } from 'child_process';

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

export function indent(code: string, spaces: number): string {
  return code
    .split('\n')
    .map((line) => ' '.repeat(spaces) + line)
    .join('\n');
}
