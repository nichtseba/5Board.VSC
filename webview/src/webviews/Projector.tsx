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
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  // Todo: replace with real document data once the editor loads from file.
  // For now this mirrors the same dummy document that Editor.tsx uses,
  // so editor and projector look identical.
  const document: BoardDocument = {
    manifest: { title: '', createdAt: '', modifiedAt: '', version: '' },
    content: {
      elements: [1, 2, 3, 4, 5, 6].map((i) => ({
        id: `element-${i}`,
        type: EditorElementType.Heading,
        yPos: i * 20,
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
    if (msg.type === 'cursorUpdate') {
      setCursor({ x: msg.x, y: msg.y });
    }
    if (msg.type === 'scrollUpdate') {
      window.scrollTo({
        top: msg.top,
        left: msg.left,
      });
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
          modifying EditorCanvas, which is out of scope for this task. 
          New: Cursor overlay: mirrors the editor's mouse position in real time 
          EditorCanvas is wrapped in a div with position: relative. */}
      <div style={{ position: 'relative' }}>
        <EditorCanvas document={document} />
        {cursor && (
          <div
            style={{
              // Todo: make cursor overlay correctly display when both windows have different sizes
              position: 'absolute',
              left: `${cursor.x * 100}%`,
              top: `${cursor.y * 100}%`,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'rgba(220, 38, 38, 0.75)',
              border: '2px solid #dc2626',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 1000,
            }}
          />
        )}
      </div>
    </div>
  );
}

init(Projector);
