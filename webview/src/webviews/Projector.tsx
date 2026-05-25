import { useEffect, useState } from 'react';
import { useMessageService, useOnMessage } from '../services/MessageService';
import { useLocalization } from '../providers/LocalizationProvider';
import { BoardDocument, EditorElementType } from '5board.vsc-common';
import { init } from '../app/init';
import EditorCanvas from '../components/canvas/EditorCanvas';

// The projector view shows the same canvas as the editor,
// but is read-only and displays a "Projector" badge.
export default function Projector() {
  const messages = useMessageService();
  const { t } = useLocalization();
  const [fileName, setFileName] = useState('');

  // Todo: replace with real document data once the editor loads from file.
  // For now this mirrors the same dummy document that Editor.tsx uses,
  // so editor and projector look identical.
  const document: BoardDocument = {
    manifest: { title: '', createdAt: '', modifiedAt: '', version: '' },
    content: {
      elements: [1, 2, 3, 4, 5, 6].map((i) => ({
        id: `element-${i}`,
        type: EditorElementType.Heading,
        yPos: i * 10,
        height: 2,
        data: {
          level: i as 1 | 2 | 3 | 4 | 5 | 6,
          content: `Heading ${i}`,
        },
      })),
    },
    sources: [],
    assets: [],
  };

  // Tell the extension that this webview is ready to receive messages
  useEffect(() => {
    messages.send({ type: 'ready' });
  }, []);

  // Listen for messages from the extension
  useOnMessage((msg) => {
    if (msg.type === 'fileLoaded') {
      setFileName(msg.fileName);
    }
  });

  return (
    <div>
      {/* Projector badge */}
      <div
        style={{
          background: 'var(--vscode-badge-background)',
          color: 'var(--vscode-badge-foreground)',
          padding: '4px 12px',
          fontWeight: 'bold',
          fontSize: '0.85rem',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        📽 {t('extension.projector.title')} — {fileName}
      </div>

      {/* Same canvas as the editor.
          The canvas manages its own selection state — clicking an element here
          also broadcasts selectElement to the extension, which updates all webviews.
          Syncing the editor's selection INTO the projector would require
          modifying EditorCanvas, which is out of scope for this task. */}
      <EditorCanvas document={document} />
    </div>
  );
}

init(Projector);
