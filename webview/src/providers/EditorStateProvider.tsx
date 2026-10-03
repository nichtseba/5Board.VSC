import { createContext, useContext, useEffect, useState } from 'react';
import { useMessageService, useOnMessage } from '../services/MessageService';
import { DEFAULT_TOOL_ID, EditorState } from '5board.vsc-common';

/**
 * Provides shared editor state that controls user interactions and editor behavior.
 * Components can access the current editor mode without managing their own copy of the state.
 */

const defaultEditorState: EditorState = {
  tool: { type: DEFAULT_TOOL_ID, parameters: undefined },
  presets: [],
};

// Context
const EditorStateContext = createContext<EditorState>(defaultEditorState);

export function EditorStateProvider({ children }: { children: React.ReactNode }) {
  const [editorState, setEditorState] = useState<EditorState>(defaultEditorState);
  const messages = useMessageService();
  useOnMessage((msg) => {
    if (msg.type === 'updateEditorState' || msg.type === 'init' || msg.type === 'initSidebar') {
      setEditorState(msg.editorState);
    }
  });

  useEffect(() => {
    messages.send({ type: 'ready' });
  }, [messages]);

  return <EditorStateContext.Provider value={editorState}>{children}</EditorStateContext.Provider>;
}

// Hook
export function useEditorState() {
  return useContext(EditorStateContext);
}
