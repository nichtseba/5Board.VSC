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

export default function SpacerTool() {
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

  const { cellSize, metrics } = useGrid();
  const rowHeight = cellSize.height;
  const canvas = document.querySelector('.editor-canvas') as HTMLElement | null;

  const getRowFromClientY = (clientY: number) => {
    const rect = canvas?.getBoundingClientRect();
    const y = clientY - (rect?.top ?? metrics.top);
    const scrollTop = canvas?.scrollTop ?? 0;
    return Math.max(0, Math.floor((y + scrollTop) / rowHeight));
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

  if (!overlayState) {
    return null;
  }

  const rect = canvas?.getBoundingClientRect();
  const scrollTop = canvas?.scrollTop ?? 0;
  const labelTop = overlayState.currentY - (rect?.top ?? metrics.top) + scrollTop;
  const canvasTop = Math.min(Math.max(12, labelTop - 12), metrics.height - 36);

  return <SpacerOverlay dragState={overlayState} canvasTop={canvasTop} labelTop={labelTop} />;
}
