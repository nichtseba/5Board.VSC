import type { CodeblockLanguage, ToolCheckResult, ToolchainConfig } from '5board.vsc-common';
import { JavaCodeblockRunner } from './JavaCodeblockRunner';

const runners = [new JavaCodeblockRunner()];

export function getRunner(language: CodeblockLanguage) {
  return runners.find((runner) => runner.canHandle(language));
}

export async function checkCodeblockTools(
  language: CodeblockLanguage,
  config?: ToolchainConfig,
): Promise<ToolCheckResult> {
  const runner = getRunner(language);
  if (!runner) {
    return { available: false, error: `Unsupported language: ${language}` };
  }
  return runner.checkTools(config);
}
