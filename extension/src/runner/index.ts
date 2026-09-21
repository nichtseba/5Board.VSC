import { JavaCodeblockRunner } from './JavaCodeblockRunner';

const runners = [new JavaCodeblockRunner()];

export function getRunner(language: string) {
  return runners.find((runner) => runner.canHandle(language));
}
