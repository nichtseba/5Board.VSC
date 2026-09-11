import {
  BoardDocument,
  CodeblockLanguage,
  EditorElementType,
  ExecutionStartResult,
  fileNameFromClassName,
} from '5board.vsc-common';
import type { EditorElement } from '5board.vsc-common';
import type { CodeElementData } from '5board.vsc-common';
import { getConfiguredJavaHome } from '../config';
import { getRunner } from './index';

export class ExecutionService {
  async start(document: BoardDocument, elementId: string): Promise<ExecutionStartResult> {
    const element = document.content.elements.find((e) => e.id === elementId);

    if (!element || element.type !== EditorElementType.Code) {
      return this.error(`Element "${elementId}" is not a code block.`);
    }

    const data = (element as EditorElement<EditorElementType.Code>).data as CodeElementData;
    const { className, language } = data;

    const runner = getRunner(language as CodeblockLanguage);
    if (!runner) {
      return this.error(`No runner available for language: ${language}`);
    }

    const fileName = fileNameFromClassName(className, language);
    const source = document.sources.find((s) => s.language === language && s.name === fileName);

    if (!source) {
      return this.error(`Source file "${fileName}" not found in document.`);
    }

    // The chain resolves once per run: `checkTools` hands the binaries it settled on to
    // `start`, so nothing probes the file system twice.
    const tools = await runner.checkTools({ home: getConfiguredJavaHome() });
    if (!tools.available) {
      const missing = tools.missingTools?.join(', ');
      return this.error(
        tools.error ??
          (missing
            ? `Required tools not found: ${missing}. Please install them to run ${language} code blocks.`
            : `Required tools for ${language} are not available.`),
      );
    }

    return runner.start({
      fileName,
      sources: document.sources,
      language: language as CodeblockLanguage,
      toolPaths: tools.toolPaths,
    });
  }

  private error(message: string): ExecutionStartResult {
    return { ok: false, error: message };
  }
}
