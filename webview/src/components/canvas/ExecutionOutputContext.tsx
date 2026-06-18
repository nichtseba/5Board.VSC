import { createContext, useContext, useState, type ReactNode } from 'react';
import type { CodeExecutionOutput } from '5board.vsc-common';
import { useOnMessage } from '../../services/MessageService';

/**
 * Holds code block execution results keyed by element id.
 *
 * Results are transient UI state: they arrive via `codeblockResult` messages and live only
 * in React state, so they are never serialized into the (persisted) document. Re-running a
 * block simply overwrites its entry.
 */
type ExecutionOutputMap = Record<string, CodeExecutionOutput>;

const ExecutionOutputContext = createContext<ExecutionOutputMap>({});

export function ExecutionOutputProvider({ children }: { children: ReactNode }) {
  const [outputs, setOutputs] = useState<ExecutionOutputMap>({});

  useOnMessage((msg) => {
    if (msg.type === 'codeblockResult') {
      setOutputs((prev) => ({ ...prev, [msg.elementId]: msg.output }));
    }
  });

  return (
    <ExecutionOutputContext.Provider value={outputs}>{children}</ExecutionOutputContext.Provider>
  );
}

/** Returns the latest execution output for the given element, or undefined if it was never run. */
export function useExecutionOutput(elementId: string): CodeExecutionOutput | undefined {
  return useContext(ExecutionOutputContext)[elementId];
}
