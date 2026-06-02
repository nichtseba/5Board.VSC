import { memo, useEffect, useRef, useState } from 'react';
import { useMessageService, useOnMessage } from '../services/MessageService';
import { BoardDocument, EditorElementType } from '5board.vsc-common';
import { init } from '../app/init';
import EditorCanvas from '../components/canvas/EditorCanvas';

// Wrapped in memo: only re-renders when fileName or fileContent actually change,
// NOT on every counter update.
function detectVersion(content: string): string | null {
  try {
    const parsed = JSON.parse(content);
    return parsed?.content?.version ?? null;
  } catch {
    return null;
  }
}

const FileView = memo(function FileView({
  fileName,
  fileContent,
}: {
  fileName: string;
  fileContent: string;
}) {
  const version = fileContent ? detectVersion(fileContent) : null;

  return (
    <div>
      <h1>5Board Webview Test Editor</h1>
      <p>{fileName}</p>
      {version ? (
        <p>Pre Projekt Version erkannt: ({version})</p>
      ) : (
        <pre>{fileContent || 'Datei ist leer.'}</pre>
      )}
    </div>
  );
});

export default function Editor() {
  const messages = useMessageService();
  //const [state, setState] = useState<AppState>({ counter: 0 });
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const rafRef = useRef<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (rafRef.current !== null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      messages.send({ type: 'cursorMove', x, y });
    });
    console.log(`Mouse Position: (${x}, ${y})`); // dev tools
  };

  const document: BoardDocument = {
    manifest: {
      title: '',
      createdAt: '',
      modifiedAt: '',
      version: '',
    },
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

  useEffect(() => {
    messages.send({ type: 'ready' });
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const top = window.document.documentElement.scrollTop;
      const left = window.document.documentElement.scrollLeft;

      messages.send({
        type: 'scroll',
        top,
        left,
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useOnMessage((msg) => {
    if (msg.type === 'init' || msg.type === 'updateContent') {
      //setState(msg.state);
    }
    if (msg.type === 'fileLoaded') {
      setFileName(msg.fileName);
      setFileContent(msg.content);
    }
  });
  return (
    <>
      <div>
        <FileView fileName={fileName} fileContent={fileContent} />
      </div>
      <div onMouseMove={handleMouseMove}>
        <EditorCanvas document={document} />
      </div>
    </>
  );
}

init(Editor);
