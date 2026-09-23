import { join } from 'path';
import { mkdir, mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import {
  formatMessage,
  type CodeblockExecutionRequest,
  type CodeblockRunner,
  type ExecutionStartResult,
  type ToolCheckResult,
  type ToolchainConfig,
} from '5board.vsc-common';
import { ProcessSession, runCommand, startProcess, writeSources } from './runnerUtils';
import { resolveJavaToolchain } from './javaToolchain';
import { describeToolchainFailure } from './javaToolchainMessages';
import { t } from '../localization';

const COMPILE_TIMEOUT_MS = 30_000;

// Piped stdio makes Java fall back to the platform encoding (Cp1252 on Windows), which mangles
// every non-ASCII character even though `file.encoding` is already UTF-8.
const ENCODING_ARGS = [
  '-Dstdout.encoding=UTF-8',
  '-Dstderr.encoding=UTF-8',
  '-Dstdin.encoding=UTF-8',
];

export class JavaCodeblockRunner implements CodeblockRunner {
  canHandle(language: string): boolean {
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
      toolPaths: { java: toolchain.javaPath, javac: toolchain.javacPath },
    };
  }

  async start(request: CodeblockExecutionRequest): Promise<ExecutionStartResult> {
    const tempDir = await mkdtemp(join(tmpdir(), '5board-'));
    const outDir = join(tempDir, 'out');

    try {
      // Written flat: tempDir doubles as the sourcepath root.
      const javaSources = request.sources.filter((s) => s.language === 'java');
      await writeSources(javaSources, tempDir);
      await mkdir(outDir, { recursive: true });

      // Only the target is compiled; javac pulls referenced classes from the sourcepath, so
      // unrelated broken sources don't block the run.
      const compile = await runCommand(
        request.toolPaths?.javac ?? 'javac',
        ['-d', outDir, '-sourcepath', tempDir, request.fileName],
        tempDir,
        COMPILE_TIMEOUT_MS,
      );

      if (compile.timedOut) {
        await rm(tempDir, { recursive: true, force: true });
        return {
          ok: false,
          error: formatMessage(t('extension.codeblock.execution.compileTimeout'), {
            seconds: COMPILE_TIMEOUT_MS / 1000,
          }),
        };
      }
      if (compile.status !== 0) {
        await rm(tempDir, { recursive: true, force: true });
        return {
          ok: false,
          error: compile.error ?? t('extension.codeblock.execution.compilationFailed'),
          stderr: compile.stderr || compile.stdout,
        };
      }
    } catch (error) {
      await rm(tempDir, { recursive: true, force: true });
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }

    const process = startProcess(
      request.toolPaths?.java ?? 'java',
      [...ENCODING_ARGS, '-cp', outDir, request.fileName.replace(/\.java$/, '')],
      tempDir,
    );

    // The program runs out of tempDir, so it can only be removed once the process is gone.
    process.onExit(() => {
      void rm(tempDir, { recursive: true, force: true });
    });

    return { ok: true, session: new ProcessSession(process) };
  }
}
