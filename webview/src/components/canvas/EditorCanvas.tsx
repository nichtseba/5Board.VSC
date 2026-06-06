import type React from 'react';
import { useRef, useState } from 'react';
import { BoardDocument } from '5board.vsc-common';
import EditorElement from './EditorElement';
import './EditorCanvas.css';

export type EditorCanvasProps = {
  document: BoardDocument;
  // Called with normalized (0–1) canvas coordinates on mouse move.
  // Only the editor provides this; pass undefined to disable mouse tracking entirely.
  onCursorMove?: (x: number, y: number) => void;
  // Called when the mouse leaves the canvas area.
  // Editor uses this to send 'cursorLeave' so the projector hides the dot.
  onCursorLeave?: () => void;
  // Called when the user clicks an element.
  // Editor uses this to send 'selectElement' to the extension.
  onElementSelect?: (id: string | null) => void;
  // Normalized (0–1) cursor position to display as a live overlay.
  // Only the projector passes this to mirror the editor's mouse position.
  cursor?: { x: number; y: number } | null;
  // Externally controlled selected element ID (projector only).
  // When provided (even as null), this overrides the internal click-selection state.
  selectedElementId?: string | null;
};

export default function EditorCanvas({
  document,
  onCursorMove,
  onCursorLeave,
  onElementSelect,
  cursor,
  selectedElementId: externalSelectedId,
}: EditorCanvasProps) {
  // Internal selection state is used in the editor (externalSelectedId not provided).
  // The projector always passes externalSelectedId so it reflects the editor's selection.
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const effectiveSelectedId =
    externalSelectedId !== undefined ? externalSelectedId : internalSelectedId;

  // rafRef throttles cursor messages: only one per animation frame is sent.
  const rafRef = useRef<number | null>(null);

  const handleSelect = (id: string) => {
    setInternalSelectedId(id);
    onElementSelect?.(id);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onCursorMove || rafRef.current !== null) return;

    // Coordinates are calculated relative to the canvas div itself, not the
    // full window or any outer wrapper. This keeps the position consistent
    // regardless of window size differences between editor and projector.
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      onCursorMove(x, y);
    });
  };

  return (
    <>
      {`Selected element ID: ${effectiveSelectedId}`}
      {/*
        position: relative is required so the absolute cursor overlay stays
        clipped inside the canvas boundaries and does not bleed outside.
      */}
      <div
        className="editor-canvas bg-editor-background"
        style={{ position: 'relative' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={onCursorLeave}
      >
        {document.content.elements.map((element) => (
          <EditorElement
            key={element.id}
            element={element}
            selected={element.id === effectiveSelectedId}
            onSelect={handleSelect}
          />
        ))}

        {/* Cursor overlay — only rendered in the projector via the cursor prop */}
        {cursor && (
          <div
            style={{
              position: 'absolute',
              left: `${cursor.x * 100}%`,
              top: `${cursor.y * 100}%`,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'rgba(220, 38, 38, 0.75)',
              border: '2px solid #dc2626',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 1000,
            }}
          />
        )}
      </div>
    </>
  );
}
