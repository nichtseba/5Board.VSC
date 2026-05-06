import { memo, useEffect, useState } from 'react';
import type { AppState } from '5board.vsc-common';
import { useMessageService, useOnMessage } from './services/MessageService';
import EditorCanvas from './components/EditorCanvas';
import EditorElement from './components/EditorElement';
import { init } from './init';

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
  const [state, setState] = useState<AppState>({ counter: 0 });
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');

  useEffect(() => {
    messages.send({ type: 'ready' });
  }, []);

  useOnMessage((msg) => {
    if (msg.type === 'init' || msg.type === 'updateContent') {
      setState(msg.state);
    }
    if (msg.type === 'fileLoaded') {
      setFileName(msg.fileName);
      setFileContent(msg.content);
    }
  });

  return (
    <EditorCanvas>
      <div>
        <h2>Counter: {state.counter}</h2>
        <button onClick={() => messages.send({ type: 'counterIncrement' })}>+</button>
        <button onClick={() => messages.send({ type: 'counterDecrement' })}>−</button>
        <FileView fileName={fileName} fileContent={fileContent} />
      </div>
    </EditorCanvas>
  );
}

init(Editor);
