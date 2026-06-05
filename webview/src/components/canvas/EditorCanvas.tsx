import { BoardDocument, EditorToolId } from '5board.vsc-common';
import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import EditorElement from './EditorElement';
import SpacerOverlay from './SpacerOverlay';
import { useMessageService, useOnMessage } from '../../services/MessageService';
import './EditorCanvas.css';
import { useGrid } from '../../providers/GridProvider';

export type EditorCanvasProps = {
  document: BoardDocument;
};

/**
 * Renders the editor canvas, which displays all editor elements based on their yPos.
 */
export default function EditorCanvas({ document }: EditorCanvasProps) {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [currentDocument, setCurrentDocument] = useState(document);
  const [activeToolId, setActiveToolId] = useState<string | null>(null);

  const messages = useMessageService();
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const { cellSize, setGridElement } = useGrid();
  useEffect(() => {
    setGridElement(canvasRef.current);
  }, [setGridElement]);
  const rowHeight = cellSize.height;

  const [dragState, setDragState] = useState<{
    startY: number;
    currentY: number;
    startRow: number;
    draggedRows: number;
  } | null>(null);

  useOnMessage((msg) => {
    if (msg.type === 'init' || msg.type === 'updateContent') {
      setActiveToolId(msg.state.selectedToolId ?? null);
    }
  });

  useEffect(() => {
    setCurrentDocument(document);
  }, [document]);

  useEffect(() => {
    messages.send({ type: 'selectElement', id: selectedElementId });
  }, [selectedElementId, messages]);

  useEffect(() => {
    if (!(activeToolId === EditorToolId.SPACER)) {
      setDragState(null);
      return;
    }

    const handlePointerRelease = () => {
      setDragState((prev) => {
        if (!prev || prev.draggedRows === 0) {
          return null;
        }

        setCurrentDocument((current) => ({
          ...current,
          content: {
            ...current.content,
            elements: current.content.elements.map((element) =>
              element.layout.yPos >= prev.startRow
                ? {
                    ...element,
                    layout: {
                      ...element.layout,
                      yPos: element.layout.yPos + prev.draggedRows,
                    },
                  }
                : element,
            ),
          },
        }));

        return null;
      });
    };

    window.addEventListener('pointerup', handlePointerRelease);
    window.addEventListener('pointercancel', handlePointerRelease);

    return () => {
      window.removeEventListener('pointerup', handlePointerRelease);
      window.removeEventListener('pointercancel', handlePointerRelease);
    };
  }, [activeToolId]);

  const getRowFromClientY = (clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;

    const y = clientY - canvas.getBoundingClientRect().top;

    return Math.max(0, Math.floor(y / rowHeight));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!(activeToolId === EditorToolId.SPACER) || event.button !== 0) return;

    event.preventDefault();
    setDragState({
      startY: event.clientY,
      currentY: event.clientY,
      startRow: getRowFromClientY(event.clientY),
      draggedRows: 0,
    });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!(activeToolId === EditorToolId.SPACER) || !dragState) return;

    const draggedRows = Math.round((event.clientY - dragState.startY) / rowHeight);

    setDragState((prev) =>
      prev
        ? {
            ...prev,
            currentY: event.clientY,
            draggedRows,
          }
        : prev,
    );
  };

  /*
   * Handler to update the layout of an element (position and size) based on its ID.
   * Used when the element is moved or resized.
   */
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
      <div
        ref={canvasRef}
        className={`editor-canvas bg-editor-background ${activeToolId === EditorToolId.SPACER ? 'cursor-row-resize' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        {activeToolId === EditorToolId.SPACER ? (
          <SpacerOverlay dragState={dragState} canvasRef={canvasRef} />
        ) : null}
        {currentDocument.content.elements.map((element) => (
          <EditorElement
            key={element.id}
            element={element}
            selected={element.id === selectedElementId}
            onSelect={setSelectedElementId}
            onUpdateLayout={handleUpdateLayout}
            activeToolId={activeToolId}
          />
        ))}
      </div>
    </>
  );
}
