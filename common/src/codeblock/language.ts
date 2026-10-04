import { indentCode, type CommentPrefix } from './markers';

interface LanguageInfo {
  fileExtension: string;
  commentPrefix: CommentPrefix;
}

// Every language that may appear in a document. Only those in SUPPORTED_LANGUAGES can be built.
const LANGUAGE_INFO: Record<string, LanguageInfo> = {
  java: { fileExtension: 'java', commentPrefix: '//' },
  javascript: { fileExtension: 'js', commentPrefix: '//' },
  python: { fileExtension: 'py', commentPrefix: '#' },
};

export function commentPrefixFor(language: string): CommentPrefix {
  return LANGUAGE_INFO[language]?.commentPrefix ?? '//';
}

export function fileExtensionFor(language: string): string {
  return LANGUAGE_INFO[language]?.fileExtension ?? 'txt';
}

/**
 * The "named class with N member blocks" model. Absent for languages where it does not fit
 * (Python, JavaScript, C) — those only get standalone runnable blocks.
 */
export interface NamedClassSupport {
  classDeclaration(className: string): string;
  wrapClassBody(className: string, markedBlocks: string): string;
}

export interface LanguageSupport {
  id: string;
  displayName: string;
  /** Indentation of members inside a class body. */
  memberIndent: number;
  sanitizeClassName(id: string): string;
  wrapRunnable(className: string, markedBlock: string): string;
  namedClasses?: NamedClassSupport;
}

export function sanitizeClassName(id: string): string {
  let name = id.replace(/[^a-zA-Z0-9_$]/g, '');
  if (name.length === 0) name = 'Block';
  if (/^[0-9]/.test(name)) name = '_' + name;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const JAVA_MEMBER_INDENT = 4;
const javaClassDeclaration = (className: string) => `public class ${className} {`;

export const JAVA_LANGUAGE_SUPPORT: LanguageSupport = {
  id: 'java',
  displayName: 'Java',
  memberIndent: JAVA_MEMBER_INDENT,
  sanitizeClassName,
  // Compact source file (JEP 512): the implicit class is named after the file, so the class
  // name must not appear in the source.
  wrapRunnable(_className, markedBlock) {
    return ['void main() {', indentCode(markedBlock, JAVA_MEMBER_INDENT), '}', ''].join('\n');
  },
  namedClasses: {
    classDeclaration: javaClassDeclaration,
    wrapClassBody(className, markedBlocks) {
      return [
        javaClassDeclaration(className),
        indentCode(markedBlocks, JAVA_MEMBER_INDENT),
        '}',
        '',
      ].join('\n');
    },
  },
};

export const PYTHON_LANGUAGE_SUPPORT: LanguageSupport = {
  id: 'python',
  displayName: 'Python',
  memberIndent: 0,
  sanitizeClassName,
  // Top-level statements are already runnable, and `namedClasses` is left out: a class whose
  // members are separate blocks has no natural Python equivalent.
  wrapRunnable: (_className, markedBlock) => `${markedBlock}\n`,
};

export const SUPPORTED_LANGUAGES: readonly LanguageSupport[] = [
  JAVA_LANGUAGE_SUPPORT,
  PYTHON_LANGUAGE_SUPPORT,
];

export function getLanguageSupport(language: string): LanguageSupport | undefined {
  return SUPPORTED_LANGUAGES.find((support) => support.id === language);
}

/** Languages that can hold user-created classes; the class UI offers only these. */
export function classLanguages(): LanguageSupport[] {
  return SUPPORTED_LANGUAGES.filter((support) => support.namedClasses !== undefined);
}
