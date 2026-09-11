import { createContext, useContext, useState, type ReactNode } from 'react';
import type { CodeExecutionOutput, TranscriptSegment } from '5board.vsc-common';
import { useOnMessage } from '../services/MessageService';

/**
 * What a code block shows below the editor: the transcript built up while the program runs,
 * plus how it ended.
 */
export type BlockExecutionState = {
  transcript: TranscriptSegment[];
  running: boolean;
  exit?: { exitCode: number | null; success: boolean; truncated: boolean };
  /**
   * Counts up on every start. Restarting a block that is already running never changes
   * `running`, so this is the only reliable signal that a *new* run began.
   */
  runId: number;
};

/**
 * Live execution state per element id.
 *
 * This is the state of runs happening *right now*. It is not the source of truth: when a run
 * ends the extension writes the transcript onto the element, so a reloaded webview reads it
 * back from the document instead (see {@link useExecutionOutput}).
 */
type ExecutionOutputMap = Record<string, BlockExecutionState>;

const ExecutionOutputContext = createContext<ExecutionOutputMap>({});
/** Set in the projector, which mirrors output but must not type into anyone's program. */
const ExecutionReadOnlyContext = createContext(false);

export function ExecutionOutputProvider({
  children,
  readOnly = false,
}: {
  children: ReactNode;
  readOnly?: boolean;
}) {
  const [outputs, setOutputs] = useState<ExecutionOutputMap>({});

  useOnMessage((msg) => {
    if (msg.type === 'codeblockStarted') {
      setOutputs((prev) => ({
        ...prev,
        [msg.elementId]: {
          transcript: [],
          running: true,
          runId: (prev[msg.elementId]?.runId ?? 0) + 1,
        },
      }));
    }
    if (msg.type === 'codeblockChunk') {
      setOutputs((prev) => {
        const current = prev[msg.elementId] ?? { transcript: [], running: true, runId: 1 };
        return {
          ...prev,
          [msg.elementId]: {
            ...current,
            transcript: appendSegment(current.transcript, msg.segment),
          },
        };
      });
    }
    if (msg.type === 'codeblockExited') {
      setOutputs((prev) => {
        const current = prev[msg.elementId] ?? { transcript: [], running: false, runId: 1 };
        return {
          ...prev,
          [msg.elementId]: {
            ...current,
            running: false,
            exit: {
              exitCode: msg.exitCode,
              success: msg.success,
              truncated: msg.truncated,
            },
          },
        };
      });
    }
    if (msg.type === 'codeblockSync') {
      setOutputs((prev) => ({
        ...prev,
        [msg.elementId]: {
          transcript: msg.transcript,
          running: msg.running,
          runId: (prev[msg.elementId]?.runId ?? 0) + 1,
        },
      }));
    }
  });

  return (
    <ExecutionReadOnlyContext.Provider value={readOnly}>
      <ExecutionOutputContext.Provider value={outputs}>{children}</ExecutionOutputContext.Provider>
    </ExecutionReadOnlyContext.Provider>
  );
}

/**
 * Execution state for one block: the live run if there is one, otherwise the transcript stored
 * on the element by the last run.
 */
export function useExecutionOutput(
  elementId: string,
  lastOutput?: CodeExecutionOutput,
): BlockExecutionState | undefined {
  const live = useContext(ExecutionOutputContext)[elementId];
  if (live) return live;
  if (!lastOutput) return undefined;

  return {
    transcript: lastOutput.transcript,
    running: false,
    runId: 0,
    exit: {
      exitCode: lastOutput.exitCode,
      success: lastOutput.success,
      truncated: lastOutput.truncated ?? false,
    },
  };
}

/** True in views that display output without being allowed to interact with it. */
export function useExecutionReadOnly(): boolean {
  return useContext(ExecutionReadOnlyContext);
}

/**
 * Chunks arrive in whatever pieces the pipes deliver them. Merging neighbours of the same kind
 * keeps the list short and, more importantly, keeps a colour tag that was split across two
 * chunks in one string so it still parses.
 */
function appendSegment(
  transcript: TranscriptSegment[],
  segment: TranscriptSegment,
): TranscriptSegment[] {
  const last = transcript[transcript.length - 1];
  if (last && last.kind === segment.kind) {
    return [...transcript.slice(0, -1), { kind: last.kind, text: last.text + segment.text }];
  }
  return [...transcript, segment];
}
