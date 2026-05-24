import { BoardDocument } from '5board.vsc-common';
import EditorCanvas from './components/canvas/EditorCanvas';
import './Editor.css';
import { init } from './init';

export default function Editor() {
  const document: BoardDocument = {
    assets: [],
    manifest: {
      title: 'Untitled Board',
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      version: '1.0.0',
    },
    content: {
      elements: [],
    },
    sources: [],
  };
  return (
    <>
      <EditorCanvas document={document} />
    </>
  );
}

init(Editor);
