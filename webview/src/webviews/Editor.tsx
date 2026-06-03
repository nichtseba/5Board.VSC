import { useEffect, useState } from 'react';
import { useMessageService, useOnMessage } from '../services/MessageService';
import { BoardDocument } from '5board.vsc-common';
import { init } from '../app/init';
import EditorCanvas from '../components/canvas/EditorCanvas';

export default function Editor() {
  const messages = useMessageService();
  const [document, setDocument] = useState<BoardDocument | null>(null);

  useEffect(() => {
    messages.send({ type: 'ready' });
  }, []);

  useOnMessage((msg) => {
    console.log('Received message in Editor:', msg.type);
    if (msg.type === 'updateDocument' || msg.type === 'init') {
      setDocument(msg.document);
    }
  });
  return <>{document && <EditorCanvas document={document} />}</>;
}

init(Editor);
