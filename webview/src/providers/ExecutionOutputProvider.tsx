import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { BoardElement, CodeExecutionOutput, CodeElementData } from '5board.vsc-common';
import { useOnMessage } from '../services/MessageService';

type ExecutionOutputMap = Record<string, CodeExecutionOutput>;

const ExecutionOutputContext = createContext<ExecutionOutputMap>({});

type Props = {
  children: ReactNode;
  elements: BoardElement[];
};

export function ExecutionOutputProvider({ children, elements }: Props) {
  const [liveOutputs, setLiveOutputs] = useState<ExecutionOutputMap>({});

  useOnMessage((msg) => {
    if (msg.type === 'codeblockResult') {
      setLiveOutputs((prev) => ({ ...prev, [msg.elementId]: msg.output }));
    }
  });

  // Prune stale live entries when persisted output is cleared (reset button).
  useEffect(() => {
    setLiveOutputs((prev) => {
      const staleIds = new Set(
        Object.keys(prev).filter((id) => {
          const el = elements.find((e) => e.id === id);
          return el && el.type === 'code' && !(el.data as CodeElementData).output;
        }),
      );
      if (staleIds.size === 0) return prev;
      return Object.fromEntries(Object.entries(prev).filter(([id]) => !staleIds.has(id)));
    });
  }, [elements]);

  // Merge: persisted baseline, live results override.
  const merged: ExecutionOutputMap = {};
  for (const el of elements) {
    if (el.type === 'code') {
      const output = (el.data as CodeElementData).output;
      if (output) merged[el.id] = output;
    }
  }
  Object.assign(merged, liveOutputs);

  return (
    <ExecutionOutputContext.Provider value={merged}>{children}</ExecutionOutputContext.Provider>
  );
}

/** Returns the latest execution output for the given element, or undefined if it was never run. */
export function useExecutionOutput(elementId: string): CodeExecutionOutput | undefined {
  return useContext(ExecutionOutputContext)[elementId];
}
