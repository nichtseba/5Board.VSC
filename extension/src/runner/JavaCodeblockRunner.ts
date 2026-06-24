import { join } from 'path';
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import type {
  CodeblockExecutionRequest,
  CodeblockExecutionResult,
  CodeblockLanguage,
  CodeblockRunner,
  Source,
  ToolCheckResult,
} from '5board.vsc-common';
import { runCommand } from './runnerUtils';

export class JavaCodeblockRunner implements CodeblockRunner {
  canHandle(language: CodeblockLanguage): boolean {
    return language === 'java';
  }

  async checkTools(): Promise<ToolCheckResult> {
    const java = await runCommand('java', ['-version'], process.cwd(), 5_000);
    const javac = await runCommand('javac', ['-version'], process.cwd(), 5_000);

    const javaOk = !java.error && java.status === 0;
    const javacOk = !javac.error && javac.status === 0;
    const missingTools = [...(!javaOk ? ['java'] : []), ...(!javacOk ? ['javac'] : [])];

    return {
      available: javaOk && javacOk,
      version: java.stdout || java.stderr || undefined,
      missingTools: missingTools.length > 0 ? missingTools : undefined,
      error: java.error ?? javac.error,
    };
  }

  async execute(request: CodeblockExecutionRequest): Promise<CodeblockExecutionResult> {
    const tempDir = await mkdtemp(join(tmpdir(), '5board-'));
    const outDir = join(tempDir, 'out');
    try {
      // Packages are not supported yet — all Java sources are written flat into tempDir, which
      // doubles as the sourcepath root so javac can resolve the target's dependencies on demand.
      const javaSources = request.sources.filter((s) => s.language === 'java');
      await writeProjectSources(javaSources, tempDir);
      await mkdir(outDir, { recursive: true });

      // Only the target file is handed to javac; classes it references are compiled automatically
      // from the sourcepath, so unrelated (possibly broken) sources don't block execution.
      const compile = await runCommand(
        'javac',
        ['-d', outDir, '-sourcepath', tempDir, request.fileName],
        tempDir,
        30_000,
      );
      if (compile.status !== 0) {
        return {
          success: false,
          stdout: compile.stdout,
          stderr: compile.stderr,
          exitCode: compile.status ?? null,
          error: compile.error ?? 'Compilation failed.',
        };
      }

      const mainClass = fileNameToClassName(request.fileName);
      const run = await runCommand('java', ['-cp', outDir, mainClass], tempDir, 30_000);
      return {
        success: run.status === 0,
        stdout: run.stdout,
        stderr: run.stderr,
        exitCode: run.status ?? null,
        error: run.error,
      };
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
}

/**
 * "Main.java" → "Main". Packages are not supported yet.
 */
function fileNameToClassName(fileName: string): string {
  return fileName.replace(/\.java$/, '');
}

async function writeProjectSources(sources: Source[], tempDir: string): Promise<void> {
  await Promise.all(
    sources.map((source) => writeFile(join(tempDir, source.name), source.code, 'utf8')),
  );
}
