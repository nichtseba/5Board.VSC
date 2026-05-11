import { Document, EditorElementType } from '5board.vsc-common';
import EditorCanvas from './components/canvas/EditorCanvas';
import './Editor.css';
import { init } from './init';

export default function Editor() {
  const document: Document = {
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
  };
  return (
    <>
      <EditorCanvas document={document} />
    </>
  );
}

init(Editor);
