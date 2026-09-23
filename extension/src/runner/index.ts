import { JavaCodeblockRunner } from './JavaCodeblockRunner';
import { PythonCodeblockRunner } from './PythonCodeblockRunner';

const runners = [new JavaCodeblockRunner(), new PythonCodeblockRunner()];

export function getRunner(language: string) {
  return runners.find((runner) => runner.canHandle(language));
}
