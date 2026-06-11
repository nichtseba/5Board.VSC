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
      <div className="editor-canvas bg-editor-background" id="html-export-canvas">
        {/* zu Testzwecken vvv */}
        <div
          style={{
            gridColumn: '2 / -1',
            gridRow: '2 / span 3',
            fontSize: 32,
            fontWeight: 700,
          }}
        >
          HTML Export Test-Anzeige
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
