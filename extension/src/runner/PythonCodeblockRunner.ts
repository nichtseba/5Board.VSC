import { join } from 'path';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import {
  type CodeblockExecutionRequest,
  type CodeblockRunner,
  type ExecutionStartResult,
  type ToolCheckResult,
  type ToolchainConfig,
} from '5board.vsc-common';
import { ProcessSession, startProcess, writeSources } from './runnerUtils';
import { resolvePythonToolchain } from './pythonToolchain';
import { describePythonFailure, formatPythonToolchainReport } from './pythonToolchainMessages';

// Over pipes Python buffers stdout, so a prompt would only appear once the program ends, and it
// falls back to the platform encoding; `-X utf8` is the counterpart to the Java runner's flags.
const RUNTIME_ARGS = ['-X', 'utf8', '-u'];

export class PythonCodeblockRunner implements CodeblockRunner {
  canHandle(language: string): boolean {
    return language === 'python';
  }

  async checkTools(config?: ToolchainConfig): Promise<ToolCheckResult> {
    const result = await resolvePythonToolchain(config?.home);
    if (!result.ok) {
      return { available: false, error: describePythonFailure(result.failure) };
    }
    return { available: true, toolPaths: { python: result.toolchain.pythonPath } };
  }

  async toolchainReport(config?: ToolchainConfig): Promise<string> {
    return formatPythonToolchainReport(await resolvePythonToolchain(config?.home), config?.home);
  }

  async start(request: CodeblockExecutionRequest): Promise<ExecutionStartResult> {
    const tempDir = await mkdtemp(join(tmpdir(), '5board-'));

    try {
      // Written flat so an `import` of another source resolves next to the target.
      await writeSources(
        request.sources.filter((source) => source.language === 'python'),
        tempDir,
      );
    } catch (error) {
      await rm(tempDir, { recursive: true, force: true });
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }

    // No compile step: a syntax error arrives as a traceback from the running process.
    const process = startProcess(
      request.toolPaths?.python ?? 'python3',
      [...RUNTIME_ARGS, request.fileName],
      tempDir,
    );

    // The program runs out of tempDir, so it can only be removed once the process is gone.
    process.onExit(() => {
      void rm(tempDir, { recursive: true, force: true });
    });

    return { ok: true, session: new ProcessSession(process) };
  }
}
