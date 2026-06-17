import { BoardDocument } from '5board.vsc-common';
import { useState } from 'react';
import EditorElement from './EditorElement';
import { SourcesProvider } from './SourcesContext';
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
    <SourcesProvider value={document.sources}>
      {`Selected element ID: ${selectedElementId}`}
      <div className="editor-canvas bg-editor-background">
        {document.content.elements.map((element) => (
          <EditorElement
            key={element.id}
            element={element}
            selected={element.id === selectedElementId}
            onSelect={setSelectedElementId}
          />
        ))}
      </div>
    </SourcesProvider>
  );
}
