import { BoardDocument } from '5board.vsc-common';
import { createContext, useContext, useState } from 'react';
import { useOnMessage } from '../services/MessageService';

// Context
const BoardDocumentContext = createContext<BoardDocument | null>(null);

export function BoardDocumentProvider({ children }: { children: React.ReactNode }) {
  const [document, setDocument] = useState<BoardDocument | null>(null);

  useOnMessage((msg) => {
    if (msg.type === 'updateDocument' || msg.type === 'init') {
      setDocument(msg.document);
    }
  });

  return <BoardDocumentContext.Provider value={document}>{children}</BoardDocumentContext.Provider>;
}

// Hook
export function useBoardDocument() {
  return useContext(BoardDocumentContext);
}
