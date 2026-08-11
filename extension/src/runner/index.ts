import type {
  CodeblockExecutionRequest,
  CodeblockExecutionResult,
  CodeblockLanguage,
  ToolCheckResult,
} from '5board.vsc-common';
import { JavaCodeblockRunner } from './JavaCodeblockRunner.js';

const runners = [new JavaCodeblockRunner()];

export function getRunner(language: CodeblockLanguage) {
  return runners.find((runner) => runner.canHandle(language));
}

export async function runCodeblock(
  request: CodeblockExecutionRequest,
): Promise<CodeblockExecutionResult> {
  const runner = getRunner(request.language);

  if (!runner) {
    return {
      success: false,
      stdout: '',
      stderr: '',
      exitCode: null,
      error: `Unsupported language: ${request.language}`,
    };
  }

  return runner.execute(request);
}

export async function checkCodeblockTools(language: CodeblockLanguage): Promise<ToolCheckResult> {
  const runner = getRunner(language);

  if (!runner) {
    return {
      available: false,
      error: `Unsupported language: ${language}`,
    };
  }

  return runner.checkTools();
}
