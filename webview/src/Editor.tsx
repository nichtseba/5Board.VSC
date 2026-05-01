import EditorCanvas from './components/EditorCanvas';
import EditorElement from './components/EditorElement';
import { init } from './init';

export default function Editor() {
  return (
    <EditorCanvas>
      <EditorElement />
    </EditorCanvas>
  );
}

init(Editor);
