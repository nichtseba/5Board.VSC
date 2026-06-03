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
          id: 'code-test-1',
          type: EditorElementType.Code,
          layout: { xPos: 0, yPos: 28, width: 36, height: 10 },
          style: { visible: true },
          data: {
            codeBlockId: 'test-block-1',
            language: 'java',
            className: 'Student',
            content:
              'public String greet(String name) {\n    return "Hallo, " + name + "!";\n}\nSystem.out.println(greet("Tom"));',
            output: 'Hallo, Tom!',
          },
        },
        {
          id: 'code-test-2',
          type: EditorElementType.Code,
          layout: { xPos: 0, yPos: 50, width: 36, height: 10 },
          style: { visible: true },
          data: {
            codeBlockId: 'test-block-1',
            language: 'java',
            className: 'Student',
            content:
              'public String greet(String name) {\n    return "Hallo, " + name + "!";\n}\nSystem.out.println(greet("Tom"));',
            errorOutput: 'SyntaxError: Unexpected token "return"',
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
