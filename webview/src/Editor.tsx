import { memo, useEffect, useState } from 'react';
import { useMessageService, useOnMessage } from './services/MessageService';
import { BoardDocument } from '5board.vsc-common';
import EditorElement from './components/EditorElement';
import { init } from './init';
import './Editor.css';
import { useLocalization } from './components/LocalizationContext';
import { Button } from 'vscrui';
import EditorCanvas from './components/canvas/EditorCanvas';

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
      elements: [],
    },
    sources: [],
    assets: [],
  };
  const { t } = useLocalization();

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
      <Button>Localized: {t('webview.customEditor.Test')}</Button>
      <div>
        <FileView fileName={fileName} fileContent={fileContent} />
      </div>
      <EditorCanvas document={document} />
    </>
  );
}

init(Editor);
