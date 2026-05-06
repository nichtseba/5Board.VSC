import { Button } from 'vscrui';
import EditorCanvas from './components/EditorCanvas';
import EditorElement from './components/EditorElement';
import { init } from './init';

export default function Editor() {
  const content = 'Hier soll der Inhalt hin';
  return (
    <>
      <Button>Test Button</Button>
      {/* <EditorCanvas>
        <div>
          <h1>5Board Webview Test Editor</h1>

          <p>Dies ist ein Testeditor, der den Inhalt der Datei anzeigt.</p>

          <pre>{content}</pre>
        </div>
        <EditorElement />
      </EditorCanvas> */}
    </>
  );
}

init(Editor);
