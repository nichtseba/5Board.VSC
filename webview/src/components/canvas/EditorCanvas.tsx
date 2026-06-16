import { BoardDocument, computeHeadingNumbers } from '5board.vsc-common';
import { useMemo, useState } from 'react';
import EditorElement from './EditorElement';
import { HeadingNumberingProvider } from './HeadingNumberingContext';
import './EditorCanvas.css';

export type EditorCanvasProps = {
  document: BoardDocument;
};

/**
 * Renders the editor canvas, which displays all editor elements based on their yPos.
 */
export default function EditorCanvas({ document }: EditorCanvasProps) {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const headingNumbers = useMemo(
    () => computeHeadingNumbers(document.content.elements),
    [document.content.elements],
  );

  return (
    <>
      {`Selected element ID: ${selectedElementId}`}
      <HeadingNumberingProvider value={headingNumbers}>
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
      </HeadingNumberingProvider>
    </>
  );
}
