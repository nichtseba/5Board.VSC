import { useMemo, useRef, useState } from 'react';
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

type DragState = {
  startY: number;
  currentY: number;
  startRow: number;
  draggedRows: number;
};

export default function SpacerTool({
  canvasRef,
}: {
  canvasRef: React.RefObject<HTMLDivElement | null>;
}) {
  const messages = useMessageService();

  /**
   * Source of truth for drag interactions.
   * Event handlers read/write this ref directly.
   */
  const dragStateRef = useRef<DragState | null>(null);

  /**
   * State only used for rendering the overlay.
   */
  const [overlayState, setOverlayState] = useState<DragState | null>(null);

  const { cellSize } = useGrid();
  const rowHeight = cellSize.height;

  const getRowFromClientY = (clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;

    const y = clientY - canvas.getBoundingClientRect().top;
    return Math.max(0, Math.floor(y / rowHeight));
  };

  const handlePointerRelease = () => {
    const dragState = dragStateRef.current;

    if (dragState && dragState.draggedRows !== 0) {
      messages.send({
        type: 'insertSpacerRows',
        startRow: dragState.startRow,
        rowCount: dragState.draggedRows,
      });
    }

    dragStateRef.current = null;
    setOverlayState(null);
  };

  useCanvasEvents(
    useMemo(
      () => ({
        pointerDown: (event) => {
          event.preventDefault();

          const dragState: DragState = {
            startY: event.clientY,
            currentY: event.clientY,
            startRow: getRowFromClientY(event.clientY),
            draggedRows: 0,
          };

          dragStateRef.current = dragState;
          setOverlayState(dragState);
        },

        pointerMove: (event) => {
          const dragState = dragStateRef.current;
          if (!dragState) {
            return;
          }

          const draggedRows = Math.round((event.clientY - dragState.startY) / rowHeight);
          dragState.currentY = event.clientY;
          dragState.draggedRows = draggedRows;

          setOverlayState({
            ...dragState,
          });
        },

        pointerUp: () => {
          handlePointerRelease();
        },
        pointerCancel: () => {
          handlePointerRelease();
        },
      }),
      [messages, rowHeight],
    ),
  );

  return <SpacerOverlay dragState={overlayState} canvasRef={canvasRef} />;
}
