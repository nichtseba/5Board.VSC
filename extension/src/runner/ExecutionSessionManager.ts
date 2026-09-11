import type {
  BoardDocument,
  CodeblockSession,
  ExecutionStartResult,
  TranscriptSegment,
  TranscriptSegmentKind,
} from '5board.vsc-common';
import { ExecutionService } from './ExecutionService';

/**
 * Caps on a single run's transcript. A runaway loop would otherwise grow the transcript until
 * the extension host runs out of memory, and every byte of it ends up in the saved document.
 */
export const MAX_OUTPUT_CHARS = 1_000_000;
export const MAX_SEGMENTS = 5_000;

const OUTPUT_LIMIT_MESSAGE = '\nOutput limit reached, execution stopped.\n';

export type SessionEvent =
  | { kind: 'started' }
  | { kind: 'segment'; segment: TranscriptSegment }
  | {
      kind: 'exited';
      exitCode: number | null;
      success: boolean;
      truncated: boolean;
      transcript: TranscriptSegment[];
    };

/** The part of {@link ExecutionService} this manager depends on, so tests can supply their own. */
export interface ExecutionStarter {
  start(document: BoardDocument, elementId: string): Promise<ExecutionStartResult>;
}

interface RunningBlock {
  session: CodeblockSession;
  transcript: TranscriptSegment[];
  chars: number;
  truncated: boolean;
  unsubscribe: () => void;
}

/**
 * Owns the processes started by one document's code blocks.
 *
 * Execution used to be a single promise that resolved when the program was already over. A
 * program that reads console input has to be reachable while it runs, so a run is now a session
 * that lives here until it exits, and the transcript is built up as it arrives.
 */
export class ExecutionSessionManager {
  private readonly blocks = new Map<string, RunningBlock>();
  /**
   * Counts starts per element. Starting is asynchronous (it compiles first), so two runs can
   * overlap; only the newest one is allowed to register its session.
   */
  private readonly startTokens = new Map<string, number>();

  constructor(
    private readonly onEvent: (elementId: string, event: SessionEvent) => void,
    private readonly starter: ExecutionStarter = new ExecutionService(),
  ) {}

  async start(document: BoardDocument, elementId: string): Promise<void> {
    this.discard(elementId);

    const token = (this.startTokens.get(elementId) ?? 0) + 1;
    this.startTokens.set(elementId, token);

    // Emitted before compiling so the block switches to "running" right away instead of
    // looking idle for the second or so that javac takes.
    this.onEvent(elementId, { kind: 'started' });

    const result = await this.starter.start(document, elementId);

    if (this.startTokens.get(elementId) !== token) {
      // A newer run took over while this one was compiling.
      if (result.ok) {
        result.session.kill();
      }
      return;
    }

    if (!result.ok) {
      const text = result.stderr?.trim() ? result.stderr : result.error;
      const transcript: TranscriptSegment[] = [{ kind: 'err', text }];
      this.onEvent(elementId, { kind: 'segment', segment: transcript[0] });
      this.onEvent(elementId, {
        kind: 'exited',
        exitCode: null,
        success: false,
        truncated: false,
        transcript,
      });
      return;
    }

    const block: RunningBlock = {
      session: result.session,
      transcript: [],
      chars: 0,
      truncated: false,
      unsubscribe: () => {},
    };
    this.blocks.set(elementId, block);

    block.unsubscribe = result.session.onEvent((event) => {
      if (event.kind === 'exited') {
        this.blocks.delete(elementId);
        block.unsubscribe();
        this.onEvent(elementId, {
          kind: 'exited',
          exitCode: event.exitCode,
          success: block.truncated ? false : event.success,
          truncated: block.truncated,
          transcript: block.transcript,
        });
        return;
      }
      this.append(elementId, block, event.kind, event.text);
    });
  }

  /**
   * Sends one line to the running program and records it in the transcript. Pipes do not echo,
   * so without this the stored transcript would show prompts that nobody ever answered.
   */
  input(elementId: string, text: string): void {
    const block = this.blocks.get(elementId);
    if (!block) return;
    block.session.write(text);
    this.append(elementId, block, 'in', text);
  }

  endInput(elementId: string): void {
    this.blocks.get(elementId)?.session.endInput();
  }

  stop(elementId: string): void {
    this.blocks.get(elementId)?.session.kill();
  }

  /** Kills every process of this document, e.g. when the document is closed. */
  stopAll(): void {
    for (const [elementId, block] of this.blocks) {
      block.unsubscribe();
      block.session.kill();
      this.startTokens.delete(elementId);
    }
    this.blocks.clear();
  }

  isRunning(elementId: string): boolean {
    return this.blocks.has(elementId);
  }

  /** Snapshot for webviews that opened or reloaded while something was already running. */
  runningBlocks(): { elementId: string; transcript: TranscriptSegment[] }[] {
    return Array.from(this.blocks, ([elementId, block]) => ({
      elementId,
      transcript: block.transcript,
    }));
  }

  /** Drops a session without reporting it, used when a newer run replaces it. */
  private discard(elementId: string): void {
    const block = this.blocks.get(elementId);
    if (!block) return;
    block.unsubscribe();
    block.session.kill();
    this.blocks.delete(elementId);
  }

  private append(
    elementId: string,
    block: RunningBlock,
    kind: TranscriptSegmentKind,
    text: string,
  ): void {
    if (block.truncated) return;

    if (block.chars + text.length > MAX_OUTPUT_CHARS || block.transcript.length >= MAX_SEGMENTS) {
      block.truncated = true;
      this.push(elementId, block, 'err', OUTPUT_LIMIT_MESSAGE);
      block.session.kill();
      return;
    }

    this.push(elementId, block, kind, text);
  }

  private push(
    elementId: string,
    block: RunningBlock,
    kind: TranscriptSegmentKind,
    text: string,
  ): void {
    const last = block.transcript[block.transcript.length - 1];
    if (last && last.kind === kind) {
      last.text += text;
    } else {
      block.transcript.push({ kind, text });
    }
    block.chars += text.length;
    this.onEvent(elementId, { kind: 'segment', segment: { kind, text } });
  }
}
