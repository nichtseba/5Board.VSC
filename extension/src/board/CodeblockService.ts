import {
  BoardContent,
  BoardDocument,
  CodeClass,
  CodeElementData,
  COMMENT_PREFIX_BY_LANGUAGE,
  EditorElement,
  EditorElementType,
  Source,
  buildSource,
  extractBlock,
  fileNameFromClassName,
  getBlockIndent,
  getLanguageSupport,
  indentCode,
  insertBlockIntoClass,
  isDefaultClassName,
  removeBlock,
  updateBlock,
} from '5board.vsc-common';

/**
 * All block↔source logic. Pure functions mutating a BoardDocument (no vscode imports, directly
 * testable) — message handlers wrap calls in `applyEdit` + `saveDocument`.
 */

export interface BlockTarget {
  /** `null`/empty = standalone (id-derived default class), omitted = keep. */
  className?: string | null;
  language?: string;
}

/** Moves a block to another class/language source, carrying its code along. */
export function moveBlock(document: BoardDocument, elementId: string, target: BlockTarget): void {
  const element = findCodeElement(document, elementId);
  if (!element) return;
  const data = element.data as CodeElementData;

  const newLanguage = target.language ?? data.language;
  const support = getLanguageSupport(newLanguage);
  if (!support) return;

  const requestedName = target.className === undefined ? data.className : (target.className ?? '');
  const newClassName = requestedName.trim()
    ? support.sanitizeClassName(requestedName.trim())
    : support.sanitizeClassName(elementId);

  if (newClassName === data.className && newLanguage === data.language) return;

  const code = detachBlock(document, elementId, data.className, data.language);
  attachBlock(document, elementId, newClassName, newLanguage, code);

  data.className = newClassName;
  data.language = newLanguage;
}

/** Writes edited block code back into its source, creating the source on first edit. */
export function updateBlockCode(document: BoardDocument, elementId: string, code: string): void {
  const element = findCodeElement(document, elementId);
  if (!element) return;
  const { className, language } = element.data as CodeElementData;

  const source = findSource(document, className, language);
  if (source) {
    const prefix = commentPrefix(language);
    const indent = getBlockIndent(source.code, elementId, prefix);
    source.code = updateBlock(source.code, elementId, indentCode(code, indent), prefix);
    source.modifiedAt = Date.now();
  } else if (getLanguageSupport(language)) {
    attachBlock(document, elementId, className, language, code);
  }
}

//#region "Class registry"

/**
 * Back-compat for documents saved before the registry existed: every source not addressed as
 * some block's default class is a named class.
 */
export function deriveCodeClasses(content: BoardContent, sources: Source[]): CodeClass[] {
  const codeElements = content.elements.filter((e) => e.type === EditorElementType.Code);
  return sources
    .filter((source) => {
      const className = classNameFromFileName(source.name);
      return !codeElements.some((element) => isDefaultClassName(className, element.id));
    })
    .map((source) => ({ name: classNameFromFileName(source.name), language: source.language }));
}

/** Registers a named class and eagerly creates its empty source, so it is visible and openable. */
export function createClass(document: BoardDocument, name: string, language: string): void {
  const support = getLanguageSupport(language);
  if (!support || !name.trim()) return;

  const className = support.sanitizeClassName(name.trim());
  if (!isClassNameAvailable(document, className, language)) return;

  document.content.codeClasses.push({ name: className, language });
  if (!findSource(document, className, language)) {
    pushSource(
      document,
      fileNameFromClassName(className, language),
      language,
      support.wrapClassBody(className, ''),
    );
  }
}

/**
 * Renames the registry entry, the source (file name + class declaration), and every member
 * element. Class-name references inside block code are the user's to update.
 */
export function renameClass(
  document: BoardDocument,
  oldName: string,
  newName: string,
  language: string,
): void {
  const support = getLanguageSupport(language);
  if (!support || !newName.trim()) return;

  const entry = findClass(document, oldName, language);
  if (!entry) return;

  const className = support.sanitizeClassName(newName.trim());
  if (className === oldName) return;
  if (!isClassNameAvailable(document, className, language)) return;
  // Renaming the source file onto an existing one (e.g. an unregistered zombie) would leave
  // two sources with the same file name.
  if (findSource(document, className, language)) return;

  const source = findSource(document, oldName, language);
  if (source) {
    source.name = fileNameFromClassName(className, language);
    source.code = source.code.replace(
      support.classDeclaration(oldName),
      support.classDeclaration(className),
    );
    source.modifiedAt = Date.now();
  }

  for (const element of document.content.elements) {
    if (element.type !== EditorElementType.Code) continue;
    const data = element.data as CodeElementData;
    if (data.className === oldName && data.language === language) {
      data.className = className;
    }
  }

  entry.name = className;
}

/**
 * Unregisters a class. Member blocks return to their default classes (runnable again); the
 * class source stays as a zombie.
 */
export function deleteClass(document: BoardDocument, name: string, language: string): void {
  const index = document.content.codeClasses.findIndex(
    (c) => c.name === name && c.language === language,
  );
  if (index === -1) return;

  for (const element of document.content.elements) {
    if (element.type !== EditorElementType.Code) continue;
    const data = element.data as CodeElementData;
    if (data.className === name && data.language === language) {
      moveBlock(document, element.id, { className: null });
    }
  }

  document.content.codeClasses.splice(index, 1);
}

function findClass(document: BoardDocument, name: string, language: string): CodeClass | undefined {
  return document.content.codeClasses.find((c) => c.name === name && c.language === language);
}

function isClassNameAvailable(document: BoardDocument, name: string, language: string): boolean {
  if (findClass(document, name, language)) return false;
  // A default class name would hijack a block's runnable main-wrapped source.
  return !document.content.elements.some(
    (element) => element.type === EditorElementType.Code && isDefaultClassName(name, element.id),
  );
}

//#endregion "Class registry"

function findCodeElement(document: BoardDocument, elementId: string): EditorElement | undefined {
  const element = document.content.elements.find((e) => e.id === elementId);
  return element?.type === EditorElementType.Code ? element : undefined;
}

function findSource(
  document: BoardDocument,
  className: string,
  language: string,
): Source | undefined {
  const fileName = fileNameFromClassName(className, language);
  return document.sources.find((s) => s.name === fileName && s.language === language);
}

function commentPrefix(language: string) {
  return COMMENT_PREFIX_BY_LANGUAGE[language] ?? '//';
}

function classNameFromFileName(fileName: string): string {
  return fileName.replace(/\.[^.]*$/, '');
}

function pushSource(document: BoardDocument, name: string, language: string, code: string): void {
  const now = Date.now();
  document.sources.push({ name, language, code, createdAt: now, modifiedAt: now });
}

/** Removes the block from its source (leaving a zombie) and returns its code. */
function detachBlock(
  document: BoardDocument,
  elementId: string,
  className: string,
  language: string,
): string {
  const source = findSource(document, className, language);
  if (!source) return '';

  const code = extractBlock(source.code, elementId, commentPrefix(language)) ?? '';
  source.code = removeBlock(source.code, elementId, commentPrefix(language));
  source.modifiedAt = Date.now();
  return code;
}

/**
 * Default classes are single-block and main-wrapped, so they are rebuilt from scratch —
 * overwriting any zombie keeps the block runnable. Named classes get the block appended.
 */
function attachBlock(
  document: BoardDocument,
  elementId: string,
  className: string,
  language: string,
  code: string,
): void {
  const source = findSource(document, className, language);
  const mainWrap = isDefaultClassName(className, elementId);

  if (source && !mainWrap) {
    source.code = insertBlockIntoClass(source.code, elementId, code, commentPrefix(language));
    source.modifiedAt = Date.now();
  } else {
    const built = buildSource({ elementId, className, language, code, mainWrap });
    if (source) {
      source.code = built;
      source.modifiedAt = Date.now();
    } else {
      pushSource(document, fileNameFromClassName(className, language), language, built);
    }
  }
}
