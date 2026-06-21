import { useEffect, useMemo, useState } from 'react';
import { EditorToolId } from '5board.vsc-common';
import { useEditorState } from '../../../providers/EditorStateProvider';
import { useCanvasEvents } from '../../../providers/CanvasEventsProvider';
import { useMessageService } from '../../../services/MessageService';
import SpacerOverlay from './SpacerOverlay';
import { useGrid } from '../../../providers/GridProvider';

/**
 * SpacerTool
 *
 * Handles vertical spacing interactions on the canvas.
 * This tool subscribes to canvas pointer events and manages its own drag state.
 * It is only active when the SPACER tool is selected in the editor state.
 */

export default function SpacerTool({
  canvasRef,
}: {
  canvasRef: React.RefObject<HTMLDivElement | null>;
}) {
  const editorState = useEditorState();
  const messages = useMessageService();

  const activeToolId = editorState?.tool.type;

  const isActive = activeToolId === EditorToolId.SPACER;

  const [dragState, setDragState] = useState<{
    startY: number;
    currentY: number;
    startRow: number;
    draggedRows: number;
  } | null>(null);

  const { cellSize, setGridElement } = useGrid();
  useEffect(() => {
    setGridElement(canvasRef.current);
  }, [setGridElement]);
  const rowHeight = cellSize.height;

  const getRowFromClientY = (clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;

    const y = clientY - canvas.getBoundingClientRect().top;
    return Math.max(0, Math.floor(y / rowHeight));
  };

  const handlePointerRelease = () => {
    if (!isActive) return;

    setDragState((prev) => {
      if (!prev || prev.draggedRows === 0) return null;

      messages.send({
        type: 'insertSpacerRows',
        startRow: prev.startRow,
        rowCount: prev.draggedRows,
      });

      return null;
    });
  };

  useCanvasEvents(
    useMemo(
      () => ({
        pointerDown: (event) => {
          if (!isActive || event.button !== 0) return;

          event.preventDefault();

          setDragState({
            startY: event.clientY,
            currentY: event.clientY,
            startRow: getRowFromClientY(event.clientY),
            draggedRows: 0,
          });
        },

        pointerMove: (event) => {
          if (!isActive) return;
          if (!dragState) return;

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
        },

        pointerUp: () => {
          handlePointerRelease();
        },
        pointerCancel: () => {
          handlePointerRelease();
        },
      }),
      [isActive, dragState, messages],
    ),
  );

  useEffect(() => {
    if (!isActive) {
      setDragState(null);
    }
  }, [isActive]);

  if (!isActive) return null;

  return <SpacerOverlay dragState={dragState} canvasRef={canvasRef} />;
}
