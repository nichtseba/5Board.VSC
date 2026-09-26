import type {
  BoardDocument,
  CodeblockSession,
  ExecutionStartResult,
  TranscriptSegment,
  TranscriptSegmentKind,
} from '5board.vsc-common';
import { ExecutionService } from './ExecutionService';
import { t } from '../localization';

// Guards against runaway loops: the transcript lives in memory and ends up in the saved document.
export const MAX_OUTPUT_CHARS = 1_000_000;
export const MAX_SEGMENTS = 5_000;

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

/** Owns the running processes of one document and builds their transcripts. */
export class ExecutionSessionManager {
  private readonly blocks = new Map<string, RunningBlock>();
  // Starting compiles first, so two starts can overlap; only the newest may register its session.
  private readonly startTokens = new Map<string, number>();

  constructor(
    private readonly onEvent: (elementId: string, event: SessionEvent) => void,
    private readonly starter: ExecutionStarter = new ExecutionService(),
  ) {}

  async start(document: BoardDocument, elementId: string): Promise<void> {
    this.discard(elementId);

    const token = (this.startTokens.get(elementId) ?? 0) + 1;
    this.startTokens.set(elementId, token);

    // Emitted before compiling, so the block shows as running while javac works.
    this.onEvent(elementId, { kind: 'started' });

    const result = await this.starter.start(document, elementId);

    if (this.startTokens.get(elementId) !== token) {
      if (result.ok) {
        result.session.kill();
      }
      return;
    }

    if (!result.ok) {
      // Compiler output is the user's error; anything else means the program never got to run.
      const segment: TranscriptSegment = result.stderr?.trim()
        ? { kind: 'err', text: result.stderr }
        : { kind: 'system', text: result.error };
      const transcript = [segment];
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

  // Recorded in the transcript because pipes don't echo what the user typed.
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
      this.push(
        elementId,
        block,
        'system',
        `\n${t('extension.codeblock.execution.outputLimit')}\n`,
      );
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
