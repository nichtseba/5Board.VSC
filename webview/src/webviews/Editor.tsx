import { memo, useEffect, useState } from 'react';
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
  const [fileName, setFileName] = useState('');
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const document: BoardDocument = {
    manifest: {
      title: '',
      createdAt: '',
      modifiedAt: '',
      version: '',
    },
    content: {
      elements: [
        ...[1, 2, 3, 4, 5, 6].map((i) => ({
          id: `heading-${i}`,
          type: EditorElementType.Heading,
          layout: {
            xPos: 0,
            yPos: i * 4,
            width: 12,
            height: 2,
          },
          style: {
            visible: true,
          },
          data: {
            level: i as 1 | 2 | 3 | 4 | 5 | 6,
            content: `Heading ${i}`,
          },
        })),
      ],
    },
    sources: [],
    assets: [],
  };

  useEffect(() => {
    messages.send({ type: 'ready' });
  }, []);

  useOnMessage((msg) => {
    if (msg.type === 'init' || msg.type === 'updateContent') {
      setActiveToolId(msg.state.selectedToolId ?? null);
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
      <EditorCanvas document={document} spacerMode={activeToolId === 'spacer'} />
    </>
  );
}

init(Editor);
