import { BoardDocument } from '5board.vsc-common';
import { useEffect, useState } from 'react';
import EditorElement from './EditorElement';
import { useMessageService } from '../../services/MessageService';
import './EditorCanvas.css';

export type EditorCanvasProps = {
  document: BoardDocument;
};

/**
 * Renders the editor canvas, which displays all editor elements based on their yPos.
 */
export default function EditorCanvas({ document }: EditorCanvasProps) {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const messages = useMessageService();

  useEffect(() => {
    messages.send({ type: 'selectElement', id: selectedElementId });
  }, [selectedElementId, messages]);

  return (
    <>
      {`Selected element ID: ${selectedElementId}`}
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
    </>
  );
}
