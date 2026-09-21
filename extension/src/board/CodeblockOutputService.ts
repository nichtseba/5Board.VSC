import type { BoardDocument, CodeExecutionOutput } from '5board.vsc-common';
import { codeElements, findCodeElement } from './CodeblockSourceService';

/** Returns whether anything was cleared, so the caller can skip the save. */
export function resetOutput(document: BoardDocument, elementId: string): boolean {
  const element = findCodeElement(document, elementId);
  if (element?.data.lastOutput === undefined) return false;

  delete element.data.lastOutput;
  return true;
}

/** Resets every block not matched by `skip` and returns the ids that were actually cleared. */
export function resetAllOutputs(
  document: BoardDocument,
  skip: (elementId: string) => boolean,
): string[] {
  return codeElements(document)
    .filter((element) => !skip(element.id) && resetOutput(document, element.id))
    .map((element) => element.id);
}

export function hasStoredOutputs(document: BoardDocument): boolean {
  return codeElements(document).some((element) => element.data.lastOutput !== undefined);
}

export function setLastOutput(
  document: BoardDocument,
  elementId: string,
  output: CodeExecutionOutput,
): boolean {
  const element = findCodeElement(document, elementId);
  if (!element) return false;

  element.data.lastOutput = output;
  return true;
}

export function setOutputCollapsed(
  document: BoardDocument,
  elementId: string,
  collapsed: boolean,
): boolean {
  const element = findCodeElement(document, elementId);
  if (!element || (element.data.outputCollapsed ?? false) === collapsed) return false;

  if (collapsed) {
    element.data.outputCollapsed = true;
  } else {
    delete element.data.outputCollapsed;
  }
  return true;
}
