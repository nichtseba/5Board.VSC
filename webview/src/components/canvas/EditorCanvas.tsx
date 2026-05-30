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
  const [currentDocument, setCurrentDocument] = useState(document);
  const messages = useMessageService();

  useEffect(() => {
    setCurrentDocument(document);
  }, [document]);

  useEffect(() => {
    messages.send({ type: 'selectElement', id: selectedElementId });
  }, [selectedElementId, messages]);

  const handleUpdateLayout = (
    id: string,
    changes: Partial<(typeof currentDocument.content.elements)[number]['layout']>,
  ) => {
    setCurrentDocument((prev) => ({
      ...prev,
      content: {
        ...prev.content,
        elements: prev.content.elements.map((element) =>
          element.id === id
            ? {
                ...element,
                layout: {
                  ...element.layout,
                  ...changes,
                },
              }
            : element,
        ),
      },
    }));
  };

  return (
    <>
      {`Selected element ID: ${selectedElementId}`}
      <div className="editor-canvas bg-editor-background">
        {currentDocument.content.elements.map((element) => (
          <EditorElement
            key={element.id}
            element={element}
            selected={element.id === selectedElementId}
            onSelect={setSelectedElementId}
            onUpdateLayout={handleUpdateLayout}
          />
        ))}
      </div>
    </>
  );
}
