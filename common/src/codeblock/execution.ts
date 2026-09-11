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
  /** Absolute paths of the resolved binaries, passed on to `start`. */
  toolPaths?: Record<string, string>;
  /** The resolved toolchain home, for diagnostics and error messages. */
  home?: string;
  missingTools?: string[];
  error?: string;
}

/** What a live process reports back while it runs. */
export type ExecutionEvent =
  | { kind: 'out' | 'err'; text: string }
  | { kind: 'exited'; exitCode: number | null; success: boolean };

/**
 * A running program. Every method is a no-op once the process has exited, so callers never
 * have to check whether it is still alive before writing to it.
 */
export interface CodeblockSession {
  /** Writes to stdin. The caller supplies the trailing newline. */
  write(text: string): void;
  /** Closes stdin, which is the EOF that read-until-EOF loops wait for. */
  endInput(): void;
  kill(): void;
  onEvent(listener: (event: ExecutionEvent) => void): () => void;
}

/**
 * Starting can fail before a process exists: no runner, no source, no toolchain, or a
 * compilation error. Those failures carry text instead of a session, so a caller never has to
 * inspect a half-alive object to find out what went wrong.
 */
export type ExecutionStartResult =
  | { ok: true; session: CodeblockSession }
  | { ok: false; error: string; stderr?: string };

export interface CodeblockRunner {
  canHandle(language: CodeblockLanguage): boolean;
  checkTools(config?: ToolchainConfig): Promise<ToolCheckResult>;
  start(request: CodeblockExecutionRequest): Promise<ExecutionStartResult>;
}
