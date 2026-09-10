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
  ToolchainConfig,
} from '5board.vsc-common';
import { runCommand } from './runnerUtils';
import { describeToolchainFailure, resolveJavaToolchain } from './javaToolchain';

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

  async execute(request: CodeblockExecutionRequest): Promise<CodeblockExecutionResult> {
    const tempDir = await mkdtemp(join(tmpdir(), '5board-'));
    const outDir = join(tempDir, 'out');
    try {
      // Write every source flat into tempDir; it doubles as the sourcepath root below.
      const javaSources = request.sources.filter((s) => s.language === 'java');
      await writeProjectSources(javaSources, tempDir);
      await mkdir(outDir, { recursive: true });

      // Compile only the target: javac pulls the classes it references from the sourcepath on
      // demand, so unrelated (possibly broken) sources don't block execution.
      const compile = await runCommand(
        request.toolPaths?.javac ?? 'javac',
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
      const run = await runCommand(
        request.toolPaths?.java ?? 'java',
        ['-cp', outDir, mainClass],
        tempDir,
        30_000,
      );
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

function fileNameToClassName(fileName: string): string {
  return fileName.replace(/\.java$/, '');
}

async function writeProjectSources(sources: Source[], tempDir: string): Promise<void> {
  await Promise.all(
    sources.map((source) => writeFile(join(tempDir, source.name), source.code, 'utf8')),
  );
}
