import { join } from 'path';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import type {
  CodeblockExecutionRequest,
  CodeblockExecutionResult,
  CodeblockLanguage,
  CodeblockRunner,
  GeneratedSourceFile,
  ToolCheckResult,
} from '5board.vsc-common';
import { indent, runCommand } from './runnerUtils.js';

/**
 * Builds the Java source code for a given code snippet and class name.
 * @param code The Java code to include in the source.
 * @param className The name of the Java class.
 * @returns The complete Java source code.
 */
function buildJavaSource(code: string, className: string): string {
  return `public class ${className} {
    public static void main(String[] args) throws Exception {
${indent(code, 8)}
    }
}
`;
}

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
    const className = request.className ?? 'CodeBlockRunner';
    const tempDir = await mkdtemp(join(tmpdir(), '5board-'));
    try {
      const content = buildJavaSource(request.code, className);
      const sourceFile = join(tempDir, `${className}.java`);
      await writeFile(sourceFile, content, 'utf8');
      const generatedFiles: GeneratedSourceFile[] = [{ path: `${className}.java`, content }];
      const compile = await runCommand('javac', [`${className}.java`], tempDir, 30_000);
      if (compile.status !== 0) {
        return {
          success: false,
          stdout: compile.stdout,
          stderr: compile.stderr,
          exitCode: compile.status ?? null,
          generatedFiles,
          error: compile.error ?? 'Compilation failed.',
        };
      }

      const run = await runCommand('java', [className], tempDir, 30_000);
      return {
        success: run.status === 0,
        stdout: run.stdout,
        stderr: run.stderr,
        exitCode: run.status ?? null,
        generatedFiles,
        error: run.error,
      };
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
}
