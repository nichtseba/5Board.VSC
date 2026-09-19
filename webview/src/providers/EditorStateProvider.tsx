import { createContext, useContext, useState } from 'react';
import { useOnMessage } from '../services/MessageService';
import { DEFAULT_TOOL_ID, EditorState } from '5board.vsc-common';

/**
 * Provides shared editor state that controls user interactions and editor behavior.
 * Components can access the current editor mode without managing their own copy of the state.
 */

const defaultEditorState: EditorState = {
  tool: { type: DEFAULT_TOOL_ID, parameters: undefined },
};

// Context
const EditorStateContext = createContext<EditorState>(defaultEditorState);

export function EditorStateProvider({ children }: { children: React.ReactNode }) {
  const [editorState, setEditorState] = useState<EditorState>(defaultEditorState);

  useOnMessage((msg) => {
    if (msg.type === 'updateEditorState' || msg.type === 'init' || msg.type === 'initSidebar') {
      setEditorState(msg.editorState);
    }
  });

  return <EditorStateContext.Provider value={editorState}>{children}</EditorStateContext.Provider>;
}

// Hook
export function useEditorState() {
  return useContext(EditorStateContext);
}
