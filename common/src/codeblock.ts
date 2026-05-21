export type CodeblockLanguage = 'java' | 'python' | 'javascript';

export interface CodeblockExecutionRequest {
  id: string;
  language: CodeblockLanguage;
  code: string;
  className?: string;
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
  generatedFiles?: GeneratedSourceFile[];
  error?: string;
}

export interface CodeblockRunner {
  canHandle(language: CodeblockLanguage): boolean;
  checkTools(): Promise<ToolCheckResult>;
  execute(request: CodeblockExecutionRequest): Promise<CodeblockExecutionResult>;
}

export type WebviewToExtensionMessage =
  | { type: 'runCodeblock'; payload: CodeblockExecutionRequest }
  | { type: 'checkCodeblockTools'; payload: { language: CodeblockLanguage } };

export type ExtensionToWebviewMessage =
  | { type: 'codeblockResult'; payload: CodeblockExecutionResult }
  | { type: 'codeblockToolCheckResult'; payload: ToolCheckResult };
