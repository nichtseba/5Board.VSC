import { Document } from '5board.vsc-common';
import { ArrayOrValue, ensureArray } from '../util';
import EditorElement from './EditorElement';
import { useState } from 'react';

export type EditorCanvasProps = {
  document: Document;
};

/**
 * Renders the editor canvas, which displays all editor elements based on their yPos.
 */
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
      <EditorStretcher lowestYPos={Math.max(...document.content.elements.map((e) => e.yPos), 10)} />
    </div>
  );
}

/**
 * Does not render anything visible, but stretches the canvas to allow scrolling when elements are near the bottom edge.
 * Todo: Figure out how to get element height properly and replace the hardcoded "5" with it, so that the stretcher is only as big as needed, not a fixed size.
 */
function EditorStretcher({ lowestYPos, lowestY }: { lowestYPos: number; lowestY?: number }) {
  let height =
    lowestY !== undefined
      ? `round(up, ${lowestY}px, var(--editor-spacing))`
      : `calc(var(--editor-spacing) * (${lowestYPos} + 5))`;
  return <div inert className="editor-stretcher" style={{ height }} />;
}
