import { FILE_EXTENSION_BY_LANGUAGE, getLanguageSupport, sanitizeClassName } from './language.js';

export function fileNameFromClassName(className: string, language: string): string {
  const extension = FILE_EXTENSION_BY_LANGUAGE[language] ?? 'txt';
  return `${className}.${extension}`;
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

  const prefix = support.commentPrefix;
  const markedBlock = `${prefix} <block id="${elementId}">\n${code}\n${prefix} </block>`;

  return mainWrap
    ? support.wrapRunnable(className, markedBlock)
    : support.wrapClassBody(className, markedBlock);
}
