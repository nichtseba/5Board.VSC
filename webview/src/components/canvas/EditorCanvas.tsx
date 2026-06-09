import { BoardDocument } from '5board.vsc-common';
import { useState } from 'react';
import EditorElement from './EditorElement';
import './EditorCanvas.css';

export type EditorCanvasProps = {
  document: BoardDocument;
};

/**
 * Renders the editor canvas, which displays all editor elements based on their yPos.
 */
export default function EditorCanvas({ document }: EditorCanvasProps) {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  return (
    <>
      {`Selected element ID: ${selectedElementId}`}
      <div className="editor-canvas bg-editor-background" data-html-export-canvas>
        {/* zu Testzwecken vvv */}
        <div
          style={{
            gridColumn: '2 / span 12',
            gridRow: '2 / span 3',
            fontSize: 32,
            fontWeight: 700,
          }}
        >
          HTML Export Test
          <h1>test</h1>
        </div>
        {/* zu Testzwecken ^^^ */}
        {document.content.elements.map((element) => (
          <EditorElement
            key={element.id}
            element={element}
            selected={element.id === selectedElementId}
            onSelect={setSelectedElementId}
          />
        ))}
      </div>
    </>
  );
}
