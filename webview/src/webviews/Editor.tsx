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
    if (msg.type === 'requestHtmlExport') {
      const body = window.document.querySelector('#root')?.innerHTML ?? '';
      const css = collectCss();

      messages.send({
        type: 'exportHtml',
        html: createHtmlExport(body, css),
        fileName,
      });
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

function createHtmlExport(body: string, css: string): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>5Board Export</title>
  <style>
${css}
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

function collectCss(): string {
  return [...document.styleSheets]
    .map((sheet) => {
      try {
        return [...sheet.cssRules].map((rule) => rule.cssText).join('\n');
      } catch {
        return '';
      }
    })
    .join('\n');
}

init(Editor);
