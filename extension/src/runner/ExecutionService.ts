import {
  fileNameFromClassName,
  formatMessage,
  type BoardDocument,
  type ExecutionStartResult,
} from '5board.vsc-common';
import { getConfiguredHome } from '../config';
import { t } from '../localization';
import { findCodeElement } from '../board/CodeblockSourceService';
import { getRunner } from './index';

export class ExecutionService {
  async start(document: BoardDocument, elementId: string): Promise<ExecutionStartResult> {
    const element = findCodeElement(document, elementId);
    if (!element) {
      return this.error(
        formatMessage(t('extension.codeblock.execution.notACodeblock'), { elementId }),
      );
    }

    const { className, language } = element.data;
    const runner = getRunner(language);
    if (!runner) {
      return this.error(formatMessage(t('extension.codeblock.execution.noRunner'), { language }));
    }

    const fileName = fileNameFromClassName(className, language);
    if (!document.sources.some((s) => s.language === language && s.name === fileName)) {
      return this.error(
        formatMessage(t('extension.codeblock.execution.sourceNotFound'), { fileName }),
      );
    }

    // `checkTools` hands the binaries it resolved to `start`, so nothing is probed twice.
    const tools = await runner.checkTools({ home: getConfiguredHome(language) });
    if (!tools.available) {
      return this.error(tools.error ?? this.missingToolsMessage(tools.missingTools, language));
    }

    return runner.start({
      fileName,
      sources: document.sources,
      language,
      toolPaths: tools.toolPaths,
    });
  }

  private missingToolsMessage(missingTools: string[] | undefined, language: string): string {
    return missingTools?.length
      ? formatMessage(t('extension.codeblock.execution.toolsMissing'), {
          tools: missingTools.join(', '),
          language,
        })
      : formatMessage(t('extension.codeblock.execution.toolsUnavailable'), { language });
  }

  private error(message: string): ExecutionStartResult {
    return { ok: false, error: message };
  }
}
