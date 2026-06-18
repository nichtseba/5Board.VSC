import { Source } from './board/document.js';

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
