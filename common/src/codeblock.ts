import { Source } from './board/document.js';

export type CodeblockLanguage = 'java' | 'python' | 'javascript';

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
