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

export interface BlockTarget {
  className?: string | null;
  language?: string;
}

export function moveBlock(document: BoardDocument, elementId: string, target: BlockTarget): void {
  const element = findCodeElement(document, elementId);
  if (!element) return;
  const data = element.data as CodeElementData;

  const newLanguage = target.language ?? data.language;
  const support = getLanguageSupport(newLanguage);
  if (!support) return;

  // Omitted className keeps the current class; null/empty means standalone (id-derived default).
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

// Back-compat for documents predating the registry: a source is a named class unless it is some
// block's id-derived default (standalone) source.
export function deriveCodeClasses(content: BoardContent, sources: Source[]): CodeClass[] {
  const codeElements = content.elements.filter((e) => e.type === EditorElementType.Code);
  return sources
    .filter((source) => {
      const className = classNameFromFileName(source.name);
      return !codeElements.some((element) => isDefaultClassName(className, element.id));
    })
    .map((source) => ({ name: classNameFromFileName(source.name), language: source.language }));
}

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
  // A source already at the target file name (e.g. a zombie) would collide on rename.
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
 * Re-homes a class (and all its member blocks) into another language. Unlike `renameClass`
 * (an in-place patch), this is genuine re-homing: each member block is detached with the old
 * language's comment prefix/wrapping and attached with the new one via `moveBlock`. The
 * old-language source stays behind as a zombie. Translating the block code itself is the
 * user's responsibility.
 */
export function changeClassLanguage(
  document: BoardDocument,
  name: string,
  language: string,
  newLanguage: string,
): void {
  const support = getLanguageSupport(newLanguage);
  if (!support || newLanguage === language) return;

  const entry = findClass(document, name, language);
  if (!entry) return;
  if (!isClassNameAvailable(document, name, newLanguage)) return;
  // A source already at the target file name (e.g. a zombie) would collide.
  if (findSource(document, name, newLanguage)) return;

  entry.language = newLanguage;

  // Eagerly create the class source in the new language (same as createClass), so the class
  // is immediately visible/openable even with zero members.
  pushSource(
    document,
    fileNameFromClassName(name, newLanguage),
    newLanguage,
    support.wrapClassBody(name, ''),
  );

  for (const element of findMemberElements(document, name, language)) {
    moveBlock(document, element.id, { language: newLanguage });
  }
}

export type DeleteClassResult = 'deleted' | 'rejected-not-empty' | 'not-found';

// Only an empty class can be deleted; the elements (not the source's markers) are the source of
// truth for membership. The class's source stays behind as a zombie.
export function deleteClass(
  document: BoardDocument,
  name: string,
  language: string,
): DeleteClassResult {
  const index = document.content.codeClasses.findIndex(
    (c) => c.name === name && c.language === language,
  );
  if (index === -1) return 'not-found';

  if (findMemberElements(document, name, language).length > 0) return 'rejected-not-empty';

  document.content.codeClasses.splice(index, 1);
  return 'deleted';
}

function findClass(document: BoardDocument, name: string, language: string): CodeClass | undefined {
  return document.content.codeClasses.find((c) => c.name === name && c.language === language);
}

function isClassNameAvailable(document: BoardDocument, name: string, language: string): boolean {
  if (findClass(document, name, language)) return false;
  // A name matching a block's default class would hijack that block's runnable source.
  return !document.content.elements.some(
    (element) => element.type === EditorElementType.Code && isDefaultClassName(name, element.id),
  );
}

/** All code elements whose (className, language) address the given class. */
function findMemberElements(
  document: BoardDocument,
  className: string,
  language: string,
): EditorElement[] {
  return document.content.elements.filter((element) => {
    if (element.type !== EditorElementType.Code) return false;
    const data = element.data as CodeElementData;
    return data.className === className && data.language === language;
  });
}

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

function attachBlock(
  document: BoardDocument,
  elementId: string,
  className: string,
  language: string,
  code: string,
): void {
  const source = findSource(document, className, language);
  const mainWrap = isDefaultClassName(className, elementId);

  // A named class gets the block appended; a default class is a single-block, main-wrapped source,
  // so it is rebuilt from scratch — overwriting any zombie of that name keeps the block runnable.
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
