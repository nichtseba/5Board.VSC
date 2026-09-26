import {
  BoardContent,
  BoardDocument,
  CodeClass,
  EditorElement,
  EditorElementType,
  LanguageSupport,
  Source,
  buildSource,
  commentPrefixFor,
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

export type CodeElement = EditorElement<EditorElementType.Code>;

export interface BlockTarget {
  className?: string | null;
  language?: string;
}

export type ClassOpResult =
  | 'ok'
  | 'unchanged'
  | 'not-found'
  | 'invalid'
  | 'name-taken'
  | 'not-empty';

export function findCodeElement(
  document: BoardDocument,
  elementId: string,
): CodeElement | undefined {
  const element = document.content.elements.find((e) => e.id === elementId);
  return element?.type === EditorElementType.Code ? (element as CodeElement) : undefined;
}

export function codeElements(document: BoardDocument): CodeElement[] {
  return document.content.elements.filter(
    (e): e is CodeElement => e.type === EditorElementType.Code,
  );
}

/**
 * The smallest free `CodeN`. A block's id is also its default class and file name, so it must
 * not match another element, a registered class or an existing source (case-insensitive, since
 * the runners write sources into one directory).
 */
export function nextCodeBlockId(document: BoardDocument): string {
  const taken = new Set(
    [
      ...document.content.elements.map((element) => element.id),
      ...document.content.codeClasses.map((codeClass) => codeClass.name),
      ...document.sources.map((source) => source.name.replace(/\.[^.]+$/, '')),
    ].map((name) => name.toLowerCase()),
  );
  let n = 1;
  while (taken.has(`code${n}`)) n++;
  return `Code${n}`;
}

export function moveBlock(document: BoardDocument, elementId: string, target: BlockTarget): void {
  const element = findCodeElement(document, elementId);
  if (!element) return;
  const { data } = element;

  const newLanguage = target.language ?? data.language;
  const support = getLanguageSupport(newLanguage);
  if (!support) return;

  // Omitted className keeps the current class; null/empty means standalone (id-derived default).
  const requestedName = target.className === undefined ? data.className : (target.className ?? '');
  const newClassName = support.sanitizeClassName(requestedName.trim() || elementId);

  if (newClassName === data.className && newLanguage === data.language) return;
  // A block can only join a named class in a language that has them.
  if (!isDefaultClassName(newClassName, elementId) && !support.namedClasses) return;

  const code = detachBlock(document, elementId, data.className, data.language);
  attachBlock(document, elementId, newClassName, support, code);

  data.className = newClassName;
  data.language = newLanguage;
}

export function updateBlockCode(document: BoardDocument, elementId: string, code: string): void {
  const element = findCodeElement(document, elementId);
  if (!element) return;
  const { className, language } = element.data;

  const source = findSource(document, className, language);
  if (source) {
    const prefix = commentPrefixFor(language);
    const indent = getBlockIndent(source.code, elementId, prefix);
    source.code = updateBlock(source.code, elementId, indentCode(code, indent), prefix);
    source.modifiedAt = Date.now();
    return;
  }

  const support = getLanguageSupport(language);
  if (support) attachBlock(document, elementId, className, support, code);
}

// Back-compat for documents predating the registry: a source is a named class unless it is some
// block's id-derived default (standalone) source.
export function deriveCodeClasses(content: BoardContent, sources: Source[]): CodeClass[] {
  const elements = content.elements.filter((e) => e.type === EditorElementType.Code);
  return sources
    .filter((source) => {
      const className = classNameFromFileName(source.name);
      return !elements.some((element) => isDefaultClassName(className, element.id));
    })
    .map((source) => ({ name: classNameFromFileName(source.name), language: source.language }));
}

export function createClass(
  document: BoardDocument,
  name: string,
  language: string,
): ClassOpResult {
  const support = getLanguageSupport(language);
  if (!support?.namedClasses || !name.trim()) return 'invalid';

  const className = support.sanitizeClassName(name.trim());
  if (!isClassNameAvailable(document, className, language)) return 'name-taken';

  document.content.codeClasses.push({ name: className, language });
  // Created eagerly so the class shows up in the file tree and opens even without members.
  if (!findSource(document, className, language)) {
    pushSource(document, className, language, support.namedClasses.wrapClassBody(className, ''));
  }
  return 'ok';
}

export function renameClass(
  document: BoardDocument,
  oldName: string,
  newName: string,
  language: string,
): ClassOpResult {
  const support = getLanguageSupport(language);
  if (!support?.namedClasses || !newName.trim()) return 'invalid';

  const entry = findClass(document, oldName, language);
  if (!entry) return 'not-found';

  const className = support.sanitizeClassName(newName.trim());
  if (className === oldName) return 'unchanged';
  // A source already at the target file name (e.g. a zombie) would collide on rename.
  if (
    !isClassNameAvailable(document, className, language) ||
    findSource(document, className, language)
  ) {
    return 'name-taken';
  }

  const source = findSource(document, oldName, language);
  if (source) {
    source.name = fileNameFromClassName(className, language);
    source.code = source.code.replace(
      support.namedClasses.classDeclaration(oldName),
      support.namedClasses.classDeclaration(className),
    );
    source.modifiedAt = Date.now();
  }

  for (const element of findMemberElements(document, oldName, language)) {
    element.data.className = className;
  }
  entry.name = className;
  return 'ok';
}

/**
 * Re-homes a class and all its member blocks into another language. The old source stays as a
 * zombie; translating the block code itself is the user's job.
 */
export function changeClassLanguage(
  document: BoardDocument,
  name: string,
  language: string,
  newLanguage: string,
): ClassOpResult {
  const support = getLanguageSupport(newLanguage);
  if (!support?.namedClasses) return 'invalid';
  if (newLanguage === language) return 'unchanged';

  const entry = findClass(document, name, language);
  if (!entry) return 'not-found';
  if (
    !isClassNameAvailable(document, name, newLanguage) ||
    findSource(document, name, newLanguage)
  ) {
    return 'name-taken';
  }

  entry.language = newLanguage;
  pushSource(document, name, newLanguage, support.namedClasses.wrapClassBody(name, ''));

  for (const element of findMemberElements(document, name, language)) {
    moveBlock(document, element.id, { language: newLanguage });
  }
  return 'ok';
}

/** Rename and language change in one step; a rejected rename leaves the language alone too. */
export function updateClass(
  document: BoardDocument,
  name: string,
  language: string,
  changes: { newName?: string; newLanguage?: string },
): ClassOpResult {
  let current = name;
  let result: ClassOpResult = 'unchanged';

  if (changes.newName?.trim()) {
    result = renameClass(document, name, changes.newName, language);
    if (result !== 'ok' && result !== 'unchanged') return result;
    current = getLanguageSupport(language)!.sanitizeClassName(changes.newName.trim());
  }

  if (changes.newLanguage && changes.newLanguage !== language) {
    const languageResult = changeClassLanguage(document, current, language, changes.newLanguage);
    if (languageResult !== 'unchanged') result = languageResult;
  }
  return result;
}

// Only an empty class can be deleted; the elements (not the source's markers) are the source of
// truth for membership. The class's source stays behind as a zombie.
export function deleteClass(
  document: BoardDocument,
  name: string,
  language: string,
): ClassOpResult {
  const index = document.content.codeClasses.findIndex(
    (c) => c.name === name && c.language === language,
  );
  if (index === -1) return 'not-found';
  if (findMemberElements(document, name, language).length > 0) return 'not-empty';

  document.content.codeClasses.splice(index, 1);
  return 'ok';
}

function findClass(document: BoardDocument, name: string, language: string): CodeClass | undefined {
  return document.content.codeClasses.find((c) => c.name === name && c.language === language);
}

function isClassNameAvailable(document: BoardDocument, name: string, language: string): boolean {
  if (findClass(document, name, language)) return false;
  // A name matching a block's default class would hijack that block's runnable source.
  return !codeElements(document).some((element) => isDefaultClassName(name, element.id));
}

function findMemberElements(
  document: BoardDocument,
  className: string,
  language: string,
): CodeElement[] {
  return codeElements(document).filter(
    (element) => element.data.className === className && element.data.language === language,
  );
}

function findSource(
  document: BoardDocument,
  className: string,
  language: string,
): Source | undefined {
  const fileName = fileNameFromClassName(className, language);
  return document.sources.find((s) => s.name === fileName && s.language === language);
}

function classNameFromFileName(fileName: string): string {
  return fileName.replace(/\.[^.]*$/, '');
}

function pushSource(
  document: BoardDocument,
  className: string,
  language: string,
  code: string,
): void {
  const now = Date.now();
  document.sources.push({
    name: fileNameFromClassName(className, language),
    language,
    code,
    createdAt: now,
    modifiedAt: now,
  });
}

function detachBlock(
  document: BoardDocument,
  elementId: string,
  className: string,
  language: string,
): string {
  const source = findSource(document, className, language);
  if (!source) return '';

  const prefix = commentPrefixFor(language);
  const code = extractBlock(source.code, elementId, prefix) ?? '';
  source.code = removeBlock(source.code, elementId, prefix);
  source.modifiedAt = Date.now();
  return code;
}

/** The only place that decides how a block enters a source. */
function attachBlock(
  document: BoardDocument,
  elementId: string,
  className: string,
  support: LanguageSupport,
  code: string,
): void {
  const language = support.id;
  const source = findSource(document, className, language);
  const mainWrap = isDefaultClassName(className, elementId);

  // A default class holds exactly one main-wrapped block, so it is rebuilt from scratch —
  // overwriting any zombie of that name keeps the block runnable.
  if (source && !mainWrap) {
    source.code = insertBlockIntoClass(
      source.code,
      elementId,
      code,
      commentPrefixFor(language),
      support.memberIndent,
    );
    source.modifiedAt = Date.now();
    return;
  }

  const built = buildSource({ elementId, className, language, code, mainWrap });
  if (source) {
    source.code = built;
    source.modifiedAt = Date.now();
  } else {
    pushSource(document, className, language, built);
  }
}
