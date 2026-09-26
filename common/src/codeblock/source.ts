import {
  commentPrefixFor,
  fileExtensionFor,
  getLanguageSupport,
  sanitizeClassName,
} from './language.js';
import { markBlock } from './markers.js';

export function fileNameFromClassName(className: string, language: string): string {
  return `${className}.${fileExtensionFor(language)}`;
}

export function isDefaultClassName(className: string, elementId: string): boolean {
  return className === sanitizeClassName(elementId);
}

export interface BuildSourceOptions {
  elementId: string;
  className: string;
  language: string;
  code: string;
  mainWrap: boolean;
}

export function buildSource(opts: BuildSourceOptions): string {
  const { elementId, className, language, code, mainWrap } = opts;
  const support = getLanguageSupport(language);
  if (!support) {
    throw new Error(`Cannot build a source for unsupported language "${language}".`);
  }

  const markedBlock = markBlock(elementId, code, commentPrefixFor(language));
  if (mainWrap) {
    return support.wrapRunnable(className, markedBlock);
  }
  if (!support.namedClasses) {
    throw new Error(`Language "${language}" has no named classes.`);
  }
  return support.namedClasses.wrapClassBody(className, markedBlock);
}
