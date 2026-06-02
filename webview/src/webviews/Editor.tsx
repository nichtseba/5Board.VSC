import { memo, useEffect, useState } from 'react';
import { useMessageService, useOnMessage } from '../services/MessageService';
import { BoardDocument, EditorElementType } from '5board.vsc-common';
import { init } from '../app/init';
import EditorCanvas from '../components/canvas/EditorCanvas';
import EditorElement from '../components/EditorElement';

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
      <EditorElement />
    </div>
  );
});

export default function Editor() {
  const messages = useMessageService();
  //const [state, setState] = useState<AppState>({ counter: 0 });
  const [fileName, setFileName] = useState('');
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
        {
          id: 'text-1',
          type: EditorElementType.Text,
          layout: { xPos: 20, yPos: 3, width: 12, height: 2 },
          style: { visible: true },
          data: { content: 'This is a text element preview.' },
        },
        {
          id: 'code-1',
          type: EditorElementType.Code,
          layout: { xPos: 10, yPos: 6, width: 12, height: 6 },
          style: { visible: true },
          data: {
            codeBlockId: 'code-block-1',
            fileName: 'example.js',
            language: 'javascript',
            content: "console.log('Hello 5Board');",
            output: 'Hello 5Board',
          },
        },
        {
          id: 'image-1',
          type: EditorElementType.Image,
          layout: { xPos: 25, yPos: 11, width: 12, height: 4 },
          style: { visible: true },
          data: {
            src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="400" height="200" fill="%23ececec"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="24" fill="%23444">Image Preview</text></svg>',
            content: '',
            altText: 'Example image',
          },
        },
        {
          id: 'shape-1',
          type: EditorElementType.Shape,
          layout: { xPos: 10, yPos: 16, width: 12, height: 4 },
          style: { visible: true },
          data: {
            shapeType: 'rectangle',
            fillColor: '#3b82f6',
            strokeColor: '#1d4ed8',
            strokeWidth: 2,
            radius: 6,
          },
        },
        {
          id: 'arrow-1',
          type: EditorElementType.Arrow,
          layout: { xPos: 20, yPos: 21, width: 12, height: 3 },
          style: { visible: true, color: '#ff8800', border: { width: 3 } },
          data: {
            points: [
              { x: 10, y: 50 },
              { x: 70, y: 50 },
              { x: 80, y: 45 },
            ],
          },
        },
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
      <EditorCanvas document={document} />
    </>
  );
}

init(Editor);
