import { useEffect } from 'react';
import { useMessageService } from '../services/MessageService';
import { init } from '../app/init';
import EditorCanvas from '../components/canvas/EditorCanvas';
import { useBoardDocument } from '../providers/BoardDocumentProvider';

export default function Editor() {
  const messages = useMessageService();
  const document = useBoardDocument();

  useEffect(() => {
    messages.send({ type: 'ready' });
    messages.send({ type: 'focus', focus: true });
  }, []);

  return (
    <>
      <p>
        <a href="5board:/c/Users/benno/OneDrive/Dokumente/bs-dnd-tools/Vorlesung.5boardz#content.json">
          TEST
        </a>
        Document: <code>{JSON.stringify(document, null, 2)}</code>
      </p>
      {document && <EditorCanvas />}
    </>
  );
}

init(Editor);
