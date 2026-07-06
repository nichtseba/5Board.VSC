import { createContext, useContext, useState } from 'react';
import { useOnMessage } from '../services/MessageService';
import { EditorState } from '5board.vsc-common';

/**
 * Provides shared editor state that controls user interactions and editor behavior.
 * Components can access the current editor mode without managing their own copy of the state.
 */

// Context
const EditorStateContext = createContext<EditorState | null>(null);

export function EditorStateProvider({ children }: { children: React.ReactNode }) {
  const [editorState, setDocument] = useState<EditorState | null>(null);

  useOnMessage((msg) => {
    if (msg.type === 'updateEditorState' || msg.type === 'init') {
      setDocument(msg.editorState);
    }
  });

  return <EditorStateContext.Provider value={editorState}>{children}</EditorStateContext.Provider>;
}

// Hook
export function useEditorState() {
  return useContext(EditorStateContext);
}
