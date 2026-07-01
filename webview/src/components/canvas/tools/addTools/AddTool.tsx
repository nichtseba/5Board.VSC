import { useMemo, useState } from 'react';
import { useCanvasEvents } from '../../../../providers/CanvasEventsProvider';
import { useMessageService } from '../../../../services/MessageService';
import { useGrid } from '../../../../providers/GridProvider';
import {
  DEFAULT_ELEMENT_PROFILES,
  EditorElementType,
  EditorTool,
  EditorToolId,
  ElementLayout,
} from '5board.vsc-common';
import AddOverlay from './AddOverlay';
import { useEditorState } from '../../../../providers/EditorStateProvider';

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
  const editorState = useEditorState();

  const elementType = (editorState.tool as EditorTool<EditorToolId.AddElement>).parameters?.type;
  const initialPosition = {
    xPos: 0,
    yPos: Math.floor((window.innerHeight / 2 - metrics.top) / cellSize.height),
  };
  const elementWidth = DEFAULT_ELEMENT_PROFILES[elementType].layout.width;
  const elementHeight = DEFAULT_ELEMENT_PROFILES[elementType].layout.height;
  const [overlayState, setOverlayState] = useState<OverlayState | null>(initialPosition);

  const getGridPosition = (clientX: number, clientY: number) => {
    const xPos = Math.max(0, Math.floor((clientX - metrics.left) / cellSize.width));
    const yPos = Math.max(0, Math.floor((clientY - metrics.top) / cellSize.height));

    return { xPos, yPos };
  };

  const applyAddConstraints = (layout: ElementLayout): ElementLayout => {
    switch (elementType) {
      case EditorElementType.Heading:
      case EditorElementType.Code:
        return {
          ...layout,
          xPos: 0,
        };

      default:
        return layout;
    }
  };

  useCanvasEvents(
    useMemo(
      () => ({
        pointerMove: (event) => {
          const raw = getGridPosition(event.clientX, event.clientY);

          const preview = applyAddConstraints({
            ...raw,
            width: elementWidth,
            height: elementHeight,
          });
          setOverlayState({ xPos: preview.xPos, yPos: preview.yPos });
        },

        pointerDown: (event) => {
          const position = getGridPosition(event.clientX, event.clientY);
          const preview = applyAddConstraints({
            ...position,
            width: elementWidth,
            height: elementHeight,
          });
          messages.send({
            type: 'addElement',
            elementType,
            elementPosition: preview,
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
    <AddOverlay
      x={overlayState.xPos * cellSize.width}
      y={overlayState.yPos * cellSize.height}
      width={elementWidth * cellSize.width}
      height={elementHeight * cellSize.height}
    />
  );
}
