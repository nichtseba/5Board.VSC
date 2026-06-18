import {
  BoardDocument,
  CodeblockExecutionResult,
  CodeblockLanguage,
  EditorElementType,
  fileNameFromClassName,
} from '5board.vsc-common';
import type { EditorElement } from '5board.vsc-common';
import type { CodeElementData } from '5board.vsc-common';
import { getRunner } from './index';

export class ExecutionService {
  async execute(document: BoardDocument, elementId: string): Promise<CodeblockExecutionResult> {
    const element = document.content.elements.find((e) => e.id === elementId);

    if (!element || element.type !== EditorElementType.Code) {
      return this.error(`Element "${elementId}" is not a code block.`);
    }

    const data = (element as EditorElement<EditorElementType.Code>).data as CodeElementData;
    const { className, language } = data;

    // Resolve the runner first: only then is the language known to be supported and its
    // file extension well-defined, so deriving the file name below is safe.
    const runner = getRunner(language as CodeblockLanguage);
    if (!runner) {
      return this.error(`No runner available for language: ${language}`);
    }

    const fileName = fileNameFromClassName(className, language);
    const source = document.sources.find((s) => s.language === language && s.name === fileName);

    if (!source) {
      return this.error(`Source file "${fileName}" not found in document.`);
    }

    return runner.execute({
      fileName,
      sources: document.sources,
      language: language as CodeblockLanguage,
    });
  }

  private error(message: string): CodeblockExecutionResult {
    return { success: false, stdout: '', stderr: '', exitCode: null, error: message };
  }
}
