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
    messages.send({ type: 'focus', focus: true });
  }, []);

  useOnMessage((msg) => {
    if (msg.type === 'updateDocument' || msg.type === 'init') {
      setDocument(msg.document);
    }
  });

  return (
    <>
      {/*<p>
        Document: <code>{JSON.stringify(document, null, 2)}</code>
      </p>*/}
      {document && <EditorCanvas document={document} />}
    </>
  );
}

init(Editor);
