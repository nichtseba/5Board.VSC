import { Button } from 'vscrui';
import EditorCanvas from './components/EditorCanvas';
import { init } from './init';
import { Document, EditorElementType } from '5board.vsc-common';
import './Editor.css';

export default function Editor() {
  const document: Document = {
    content: {
      elements: [
        {
          id: '1',
          type: EditorElementType.Heading,
          yPos: 0,
          data: {
            level: 1,
            content: 'Hello World',
          },
        },
        {
          id: '2',
          type: EditorElementType.Heading,
          yPos: 10,
          data: {
            level: 3,
            content: 'Hello World',
          },
        },
      ],
    },
  };
  return (
    <>
      <EditorCanvas document={document} />
    </>
  );
}

init(Editor);
