import { BoardDocument } from '5board.vsc-common';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import EditorElement from './EditorElement';
import SpacerOverlay from './SpacerOverlay';
import { useMessageService } from '../../services/MessageService';
import { getGridCellSize } from '../../util';
import './EditorCanvas.css';

export type EditorCanvasProps = {
  document: BoardDocument;
  spacerMode?: boolean;
};

/**
 * Renders the editor canvas, which displays all editor elements based on their yPos.
 */
export default function EditorCanvas({ document, spacerMode = false }: EditorCanvasProps) {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [currentDocument, setCurrentDocument] = useState(document);
  const [canvasGridSize, setCanvasGridSize] = useState(() => getGridCellSize(null));
  const [dragState, setDragState] = useState<{
    startY: number;
    currentY: number;
    startRow: number;
    draggedRows: number;
  } | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const messages = useMessageService();

  useEffect(() => {
    setCurrentDocument(document);
  }, [document]);

  useLayoutEffect(() => {
    setCanvasGridSize(getGridCellSize(canvasRef.current));
  }, [spacerMode, currentDocument.content.elements.length]);

  useEffect(() => {
    messages.send({ type: 'selectElement', id: selectedElementId });
  }, [selectedElementId, messages]);

  useEffect(() => {
    if (!spacerMode) {
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
  }, [spacerMode]);

  const rowHeight = useMemo(() => canvasGridSize.height, [canvasGridSize.height]);

  const getRowFromClientY = (clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;

    const y = clientY - canvas.getBoundingClientRect().top;

    return Math.max(0, Math.floor(y / rowHeight));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!spacerMode || event.button !== 0) return;

    event.preventDefault();
    setDragState({
      startY: event.clientY,
      currentY: event.clientY,
      startRow: getRowFromClientY(event.clientY),
      draggedRows: 0,
    });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!spacerMode || !dragState) return;

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
        className={`editor-canvas bg-editor-background ${spacerMode ? 'cursor-row-resize' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        {spacerMode ? <SpacerOverlay dragState={dragState} canvasRef={canvasRef} /> : null}
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
