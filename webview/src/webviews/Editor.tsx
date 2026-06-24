import { useEffect, useState } from 'react';
import { useMessageService, useOnMessage } from '../services/MessageService';
import { BoardDocument } from '5board.vsc-common';
import { init } from '../app/init';
import EditorCanvas from '../components/canvas/EditorCanvas';
import { SourcesProvider } from '../providers/SourcesProvider';
import { ExecutionOutputProvider } from '../providers/ExecutionOutputProvider';

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
      <p>
        <a href="5board:/c/Users/benno/OneDrive/Dokumente/bs-dnd-tools/Vorlesung.5boardz#content.json">
          TEST
        </a>
        Document: <code>{JSON.stringify(document, null, 2)}</code>
      </p>
      <ExecutionOutputProvider>
        {document && (
          <SourcesProvider value={document.sources}>
            <EditorCanvas document={document} />
          </SourcesProvider>
        )}
      </ExecutionOutputProvider>
    </>
  );
}

init(Editor);
