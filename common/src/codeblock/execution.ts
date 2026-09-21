import { Source } from '../board/document.js';

export interface CodeblockExecutionRequest {
  fileName: string;
  sources: Source[];
  language: string;
  /** Resolved binaries keyed by tool name, e.g. `java`. */
  toolPaths?: Record<string, string>;
}

export interface ToolchainConfig {
  home?: string;
}

export interface ToolCheckResult {
  available: boolean;
  toolPaths?: Record<string, string>;
  missingTools?: string[];
  error?: string;
}

export type ExecutionEvent =
  | { kind: 'out' | 'err'; text: string }
  | { kind: 'exited'; exitCode: number | null; success: boolean };

/** A running program. Every method is a no-op once the process has exited. */
export interface CodeblockSession {
  /** The caller supplies the trailing newline. */
  write(text: string): void;
  /** Closes stdin (EOF). */
  endInput(): void;
  kill(): void;
  onEvent(listener: (event: ExecutionEvent) => void): () => void;
}

/** `stderr` is set for compile errors; `error` alone means the program never got to compile. */
export type ExecutionStartResult =
  | { ok: true; session: CodeblockSession }
  | { ok: false; error: string; stderr?: string };

export interface CodeblockRunner {
  canHandle(language: string): boolean;
  checkTools(config?: ToolchainConfig): Promise<ToolCheckResult>;
  start(request: CodeblockExecutionRequest): Promise<ExecutionStartResult>;
}
