import { useMemo, useState } from 'react';
import { useCanvasEvents } from '../../../providers/CanvasEventsProvider';
import { useMessageService } from '../../../services/MessageService';
import { useGrid } from '../../../providers/GridProvider';
import { EditorElementType } from '5board.vsc-common';
import AddOverlay from './AddOverlay';

/**
 * AddTool
 *
 * Handles adding a new element to a specific location.
 * The preview follows the mouse and snaps to the grid.
 * Clicking places the element and exits the tool.
 */

type OverlayState = {
  xPos: number;
  yPos: number;
};

export default function AddTool() {
  const messages = useMessageService();
  const { cellSize, metrics } = useGrid();

  const [overlayState, setOverlayState] = useState<OverlayState | null>(null);

  const getGridPosition = (clientX: number, clientY: number) => {
    const xPos = Math.max(0, Math.floor((clientX - metrics.left) / cellSize.width));
    const yPos = Math.max(0, Math.floor((clientY - metrics.top) / cellSize.height));

    return { xPos, yPos };
  };

  useCanvasEvents(
    useMemo(
      () => ({
        pointerMove: (event) => {
          setOverlayState(getGridPosition(event.clientX, event.clientY));
        },

        pointerDown: (event) => {
          const position = getGridPosition(event.clientX, event.clientY);

          messages.send({
            type: 'addElement',
            elementType: EditorElementType.Text,
            elementPosition: {
              ...position,
              width: 10,
              height: 10,
            },
          });
        },
      }),
      [messages, metrics, cellSize],
    ),
  );

  if (!overlayState) {
    return null;
  }

  return (
    <AddOverlay x={overlayState.xPos * cellSize.width} y={overlayState.yPos * cellSize.height} />
  );
}
