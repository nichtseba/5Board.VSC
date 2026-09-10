import { indentCode, type CommentPrefix } from './markers.js';

export type CodeblockLanguage = 'java' | 'python' | 'javascript';

export const COMMENT_PREFIX_BY_LANGUAGE: Record<string, CommentPrefix> = {
  java: '//',
  javascript: '//',
  python: '#',
};

export const FILE_EXTENSION_BY_LANGUAGE: Record<string, string> = {
  java: 'java',
  python: 'py',
  javascript: 'js',
};

export interface LanguageSupport {
  id: string;
  displayName: string;
  fileExtension: string;
  commentPrefix: CommentPrefix;
  sanitizeClassName(id: string): string;
  classDeclaration(className: string): string;
  /**
   * Builds a directly runnable source. Java writes a compact source file, where the class is
   * implicit and named after the file — hence the unused class name there; other languages may
   * still need it.
   */
  wrapRunnable(className: string, markedBlock: string): string;
  wrapClassBody(className: string, markedBlocks: string): string;
  runTarget?(fileName: string): string;
}

export function sanitizeClassName(id: string): string {
  let name = id.replace(/[^a-zA-Z0-9_$]/g, '');
  if (name.length === 0) name = 'Block';
  if (/^[0-9]/.test(name)) name = '_' + name;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export const JAVA_LANGUAGE_SUPPORT: LanguageSupport = {
  id: 'java',
  displayName: 'Java',
  fileExtension: 'java',
  commentPrefix: '//',
  sanitizeClassName,
  classDeclaration: (className) => `public class ${className} {`,
  wrapRunnable(_className, markedBlock) {
    // Compact source file (JEP 512, Java 25+): the implicitly declared class is named after the
    // file, so the class name only determines the file name and must not appear in the source.
    return ['void main() {', indentCode(markedBlock, 4), '}', ''].join('\n');
  },
  wrapClassBody(className, markedBlocks) {
    return [this.classDeclaration(className), indentCode(markedBlocks, 4), '}', ''].join('\n');
  },
};

export const SUPPORTED_LANGUAGES: readonly LanguageSupport[] = [JAVA_LANGUAGE_SUPPORT];

export function getLanguageSupport(language: string): LanguageSupport | undefined {
  return SUPPORTED_LANGUAGES.find((support) => support.id === language);
}
