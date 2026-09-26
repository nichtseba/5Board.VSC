import { BoardDocument } from '5board.vsc-common';
import { createContext, useContext, useState } from 'react';
import { useOnMessage } from '../services/MessageService';

/**
 * Provides access to the current board document and its content.
 * Acts as the shared source of truth for all document-related data.
 */

// Context
const BoardDocumentContext = createContext<BoardDocument | null>(null);

export function BoardDocumentProvider({ children }: { children: React.ReactNode }) {
  const [document, setDocument] = useState<BoardDocument | null>(null);

  useOnMessage((msg) => {
    if (msg.type === 'updateDocument' || msg.type === 'init' || msg.type === 'initSidebar') {
      setDocument(msg.document);
    }
  });

  return <BoardDocumentContext.Provider value={document}>{children}</BoardDocumentContext.Provider>;
}

// Hook
export function useBoardDocument() {
  return useContext(BoardDocumentContext);
}
