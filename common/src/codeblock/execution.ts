import { Source } from '../board/document.js';
import { CodeblockLanguage } from './language.js';

export interface CodeblockExecutionRequest {
  fileName: string;
  sources: Source[];
  language: CodeblockLanguage;
  /** Absolute paths of the resolved toolchain binaries, keyed by tool name (e.g. `java`). */
  toolPaths?: Record<string, string>;
}

/** User-supplied toolchain location, kept language-neutral so every runner can take one. */
export interface ToolchainConfig {
  home?: string;
}

export interface GeneratedSourceFile {
  path: string;
  content: string;
}

export interface ToolCheckResult {
  available: boolean;
  version?: string;
  majorVersion?: number;
  /** Absolute paths of the resolved binaries, passed on to `execute`. */
  toolPaths?: Record<string, string>;
  /** The resolved toolchain home, for diagnostics and error messages. */
  home?: string;
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
  checkTools(config?: ToolchainConfig): Promise<ToolCheckResult>;
  execute(request: CodeblockExecutionRequest): Promise<CodeblockExecutionResult>;
}
