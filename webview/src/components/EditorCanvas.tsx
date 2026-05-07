import { Document } from '5board.vsc-common';
import { ArrayOrValue, ensureArray } from '../util';
import EditorElement from './EditorElement';
import { useState } from 'react';

export type EditorCanvasProps = {
  document: Document;
};

export default function EditorCanvas({ document }: EditorCanvasProps) {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  return (
    <div className="editor-canvas">
      {document.content.elements.map((element) => (
        <EditorElement
          key={element.id}
          element={element}
          selected={element.id === selectedElementId}
          onSelect={setSelectedElementId}
        />
      ))}
    </div>
  );
}
