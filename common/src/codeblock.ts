import { Source } from './board/document.js';
import { indentCode, type CommentPrefix, COMMENT_PREFIX_BY_LANGUAGE } from './codeMarkers.js';

export type CodeblockLanguage = 'java' | 'python' | 'javascript';

/**
 * File extension per language. The class name is the source of truth on a code block;
 * the source file name is derived from it via {@link fileNameFromClassName}.
 */
export const FILE_EXTENSION_BY_LANGUAGE: Record<string, string> = {
  java: 'java',
  python: 'py',
  javascript: 'js',
};

/**
 * Derives the source file name a code block maps to from its class name, e.g.
 * ("Main", "java") → "Main.java". Only meaningful for supported languages.
 */
export function fileNameFromClassName(className: string, language: string): string {
  const extension = FILE_EXTENSION_BY_LANGUAGE[language] ?? 'txt';
  return `${className}.${extension}`;
}

/**
 * Sanitizes a raw element id into a valid Java class name.
 * Uppercases the first letter, strips invalid characters, prefixes with '_' if it starts
 * with a digit.
 */
export function sanitizeClassName(id: string): string {
  let name = id.replace(/[^a-zA-Z0-9_$]/g, '');
  if (name.length === 0) name = 'Block';
  if (/^[0-9]/.test(name)) name = '_' + name;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Returns true if the className is the auto-generated default for the given element id,
 * meaning the block should be wrapped with a `main` method.
 */
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

/**
 * Builds a complete source file from block code. For Java, wraps the code in a class
 * and optionally in a `main` method.
 */
export function buildSource(opts: BuildSourceOptions): string {
  const { elementId, className, code, mainWrap } = opts;
  const prefix: CommentPrefix = COMMENT_PREFIX_BY_LANGUAGE[opts.language] ?? '//';
  const blockIndent = mainWrap ? 8 : 4;
  const pad = ' '.repeat(blockIndent);
  const markerOpen = `${pad}${prefix} <block id="${elementId}">`;
  const markerClose = `${pad}${prefix} </block>`;
  const indented = indentCode(code, blockIndent);

  const lines: string[] = [];
  lines.push(`public class ${className} {`);
  if (mainWrap) {
    lines.push(`    public static void main(String[] args) {`);
  }
  lines.push(markerOpen);
  lines.push(indented);
  lines.push(markerClose);
  if (mainWrap) {
    lines.push(`    }`);
  }
  lines.push(`}`);
  lines.push('');
  return lines.join('\n');
}

export interface CodeblockExecutionRequest {
  fileName: string;
  sources: Source[];
  language: CodeblockLanguage;
}

export interface GeneratedSourceFile {
  path: string;
  content: string;
}

export interface ToolCheckResult {
  available: boolean;
  version?: string;
  missingTools?: string[];
  error?: string;
}

export interface CodeblockExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  error?: string;
}

export interface CodeblockRunner {
  canHandle(language: CodeblockLanguage): boolean;
  checkTools(): Promise<ToolCheckResult>;
  execute(request: CodeblockExecutionRequest): Promise<CodeblockExecutionResult>;
}
