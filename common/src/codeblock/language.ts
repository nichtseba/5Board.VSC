import { indentCode, type CommentPrefix } from './markers.js';

export type CodeblockLanguage = 'java' | 'python' | 'javascript';

// These tables cover every language that can appear in existing documents; full
// LanguageSupport exists only for languages that can be scaffolded and run.
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

/** Language-specific source scaffolding; `buildSource` delegates the class/`main` syntax here. */
export interface LanguageSupport {
  id: string;
  displayName: string;
  fileExtension: string;
  commentPrefix: CommentPrefix;
  sanitizeClassName(id: string): string;
  /** The class declaration line, e.g. "public class Foo {". */
  classDeclaration(className: string): string;
  /** Standalone runnable class: one marked block wrapped in `main`. */
  wrapRunnable(className: string, markedBlock: string): string;
  /** Named class holding N member blocks; not run directly. */
  wrapClassBody(className: string, markedBlocks: string): string;
  /** e.g. "Foo.java" → "Foo". */
  runTarget?(fileName: string): string;
}

/** Turns a raw element id into a valid Java class name. */
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
  wrapRunnable(className, markedBlock) {
    return [
      this.classDeclaration(className),
      '    public static void main(String[] args) {',
      indentCode(markedBlock, 8),
      '    }',
      '}',
      '',
    ].join('\n');
  },
  wrapClassBody(className, markedBlocks) {
    return [this.classDeclaration(className), indentCode(markedBlocks, 4), '}', ''].join('\n');
  },
};

export const SUPPORTED_LANGUAGES: readonly LanguageSupport[] = [JAVA_LANGUAGE_SUPPORT];

export function getLanguageSupport(language: string): LanguageSupport | undefined {
  return SUPPORTED_LANGUAGES.find((support) => support.id === language);
}
