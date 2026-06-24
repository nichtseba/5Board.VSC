import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { BoardDocument, EditorToolId } from '5board.vsc-common';
import EditorElement from './EditorElement';
import ProjectorMouse, { ProjectorCursor } from '../projector/ProjectorMouse';
import './EditorCanvas.css';
import { useEditorState } from '../../providers/EditorStateProvider';
import { useCanvasEventDispatcher } from '../../providers/CanvasEventsProvider';
import { useMessageService } from '../../services/MessageService';
import { useGrid } from '../../providers/GridProvider';
import { CanvasTools } from './tools/CanvasTools';

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
  cursor?: ProjectorCursor | null;
  // Externally controlled selected element ID (projector only).
  // When provided (even as null), this overrides the internal click-selection state.
  selectedElementId?: string | null;
};

export default function EditorCanvas({
  document,
  onCursorMove,
  onCursorLeave,
  cursor,
  selectedElementId: externalSelectedId,
}: EditorCanvasProps) {
  // Internal selection state is used in the editor (externalSelectedId not provided).
  // The projector always passes externalSelectedId so it reflects the editor's selection.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const effectiveSelectedId =
    externalSelectedId !== undefined ? externalSelectedId : internalSelectedId;

  // rafRef throttles cursor messages: only one per animation frame is sent.
  const rafRef = useRef<number | null>(null);

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

  //const document = useBoardDocument();
  const editorState = useEditorState();
  const { emit } = useCanvasEventDispatcher();

  //const selectedElementId = document?.content.selectedElementId ?? null;
  const activeToolId = editorState?.tool.type;

  const messages = useMessageService();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const { setGridElement } = useGrid();

  useEffect(() => {
    setGridElement(canvasRef.current);
    return () => {
      setGridElement(null);
    };
  }, [setGridElement]);

  useEffect(() => {
    if (activeToolId !== EditorToolId.POINTER && document?.content.selectedElementId) {
      messages.send({
        type: 'selectElement',
        id: null,
      });
    }
  }, [activeToolId, document?.content.selectedElementId, messages]);

  return (
    <>
      {/*
        position: relative is required so the absolute cursor overlay stays
        clipped inside the canvas boundaries and does not bleed outside.
      */}
      <div
        ref={canvasRef}
        className={`editor-canvas bg-editor-background ${activeToolId === EditorToolId.SPACER ? 'cursor-row-resize' : ''}`}
        style={{ position: 'relative' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={onCursorLeave}
        onPointerDown={(e) => emit('pointerDown', e.nativeEvent)} // Todo: do not hand over dom elements directly
        onPointerMove={(e) => emit('pointerMove', e.nativeEvent)}
        onPointerUp={(e) => emit('pointerUp', e.nativeEvent)}
        onPointerCancel={(e) => emit('pointerCancel', e.nativeEvent)}
      >
        <CanvasTools />

        {document?.content.elements.map((element) => (
          <EditorElement
            key={element.id}
            element={element}
            selected={element.id === effectiveSelectedId} // to selectedElementId
          />
        ))}

        {/* Cursor overlay — only rendered in the projector via the cursor prop */}
        <ProjectorMouse cursor={cursor ?? null} />
      </div>
    </>
  );
}
