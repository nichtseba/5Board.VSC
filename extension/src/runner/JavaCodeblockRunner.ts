import { join } from 'path';
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import type {
  CodeblockExecutionRequest,
  CodeblockLanguage,
  CodeblockRunner,
  CodeblockSession,
  ExecutionEvent,
  ExecutionStartResult,
  Source,
  ToolCheckResult,
  ToolchainConfig,
} from '5board.vsc-common';
import { runCommand, startProcess, type ProcessHandle } from './runnerUtils';
import { describeToolchainFailure, resolveJavaToolchain } from './javaToolchain';

const COMPILE_TIMEOUT_MS = 30_000;

/**
 * Forces UTF-8 on the child's streams. Piped (non-terminal) stdio makes Java fall back to the
 * platform encoding for stdout, which mangles anything non-ASCII on Windows even though
 * `file.encoding` is already UTF-8.
 */
const ENCODING_ARGS = [
  '-Dstdout.encoding=UTF-8',
  '-Dstderr.encoding=UTF-8',
  '-Dstdin.encoding=UTF-8',
];

export class JavaCodeblockRunner implements CodeblockRunner {
  canHandle(language: CodeblockLanguage): boolean {
    return language === 'java';
  }

  async checkTools(config?: ToolchainConfig): Promise<ToolCheckResult> {
    const result = await resolveJavaToolchain(config?.home);

    if (!result.ok) {
      const { failure } = result;
      return {
        available: false,
        missingTools: failure.kind === 'incomplete-jdk' ? failure.missing : undefined,
        error: describeToolchainFailure(failure),
      };
    }

    const { toolchain } = result;
    return {
      available: true,
      version: `Java ${toolchain.majorVersion}`,
      majorVersion: toolchain.majorVersion,
      toolPaths: { java: toolchain.javaPath, javac: toolchain.javacPath },
      home: toolchain.home,
    };
  }

  async start(request: CodeblockExecutionRequest): Promise<ExecutionStartResult> {
    const tempDir = await mkdtemp(join(tmpdir(), '5board-'));
    const outDir = join(tempDir, 'out');

    try {
      // Write every source flat into tempDir; it doubles as the sourcepath root below.
      const javaSources = request.sources.filter((s) => s.language === 'java');
      await writeProjectSources(javaSources, tempDir);
      await mkdir(outDir, { recursive: true });

      // Compile only the target: javac pulls the classes it references from the sourcepath on
      // demand, so unrelated (possibly broken) sources don't block execution. This stays a
      // batch step with a timeout, because a compiler that hangs is never waiting for a user.
      const compile = await runCommand(
        request.toolPaths?.javac ?? 'javac',
        ['-d', outDir, '-sourcepath', tempDir, request.fileName],
        tempDir,
        COMPILE_TIMEOUT_MS,
      );

      if (compile.status !== 0) {
        await rm(tempDir, { recursive: true, force: true });
        return {
          ok: false,
          error: compile.error ?? 'Compilation failed.',
          stderr: compile.stderr || compile.stdout,
        };
      }
    } catch (error) {
      await rm(tempDir, { recursive: true, force: true });
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }

    const mainClass = fileNameToClassName(request.fileName);
    const process = startProcess(
      request.toolPaths?.java ?? 'java',
      [...ENCODING_ARGS, '-cp', outDir, mainClass],
      tempDir,
    );

    // The temp directory holds the classes the process is running from, so it can only go once
    // the process is gone. That is why it is cleaned up here and not in a `finally`.
    process.onExit(() => {
      void rm(tempDir, { recursive: true, force: true });
    });

    return { ok: true, session: new ProcessSession(process) };
  }
}

/** Adapts a {@link ProcessHandle} to the language-neutral session interface. */
class ProcessSession implements CodeblockSession {
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

function fileNameToClassName(fileName: string): string {
  return fileName.replace(/\.java$/, '');
}

async function writeProjectSources(sources: Source[], tempDir: string): Promise<void> {
  await Promise.all(
    sources.map((source) => writeFile(join(tempDir, source.name), source.code, 'utf8')),
  );
}
