import { createContext, useContext, useState, type ReactNode } from 'react';
import type { CodeExecutionOutput, TranscriptSegment } from '5board.vsc-common';
import { useOnMessage } from '../services/MessageService';

export type BlockExecutionState = {
  transcript: TranscriptSegment[];
  running: boolean;
  exit?: { exitCode: number | null; success: boolean; truncated: boolean };
  // Only reliable signal for a new run: a restart while running never changes `running`.
  runId: number;
  // Projector only; the editor keeps the input line in local state.
  draft?: string;
};

// Live runs only. Finished runs are stored on the element (`lastOutput`), see useExecutionOutput.
type ExecutionOutputMap = Record<string, BlockExecutionState>;

const ExecutionOutputContext = createContext<ExecutionOutputMap>({});
// Set in the projector: it mirrors output but must not type into the program.
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
            draft: undefined,
            exit: {
              exitCode: msg.exitCode,
              success: msg.success,
              truncated: msg.truncated,
            },
          },
        };
      });
    }
    if (msg.type === 'codeblockInputDraft' && readOnly) {
      setOutputs((prev) => {
        const current = prev[msg.elementId];
        if (!current?.running) return prev;
        return { ...prev, [msg.elementId]: { ...current, draft: msg.text } };
      });
    }
    if (msg.type === 'codeblockOutputCleared') {
      setOutputs((prev) =>
        Object.fromEntries(Object.entries(prev).filter(([id]) => id !== msg.elementId)),
      );
    }
    if (msg.type === 'codeblockTranscriptCleared') {
      setOutputs((prev) => {
        const current = prev[msg.elementId];
        if (!current) return prev;
        // runId stays, otherwise the input line would lose what is typed into it.
        return { ...prev, [msg.elementId]: { ...current, transcript: [] } };
      });
    }
    if (msg.type === 'codeblockSync') {
      setOutputs((prev) => ({
        ...prev,
        [msg.elementId]: {
          transcript: msg.transcript,
          running: msg.running,
          runId: (prev[msg.elementId]?.runId ?? 0) + 1,
          draft: readOnly ? msg.draft : undefined,
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

/** The live run if there is one, otherwise the transcript stored by the last run. */
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

export function useExecutionReadOnly(): boolean {
  return useContext(ExecutionReadOnlyContext);
}

// Merging neighbours of the same kind keeps a colour tag split across two chunks parsable.
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
