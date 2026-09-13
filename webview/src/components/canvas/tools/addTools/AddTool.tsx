import { useMemo, useState } from 'react';
import { useCanvasEvents } from '../../../../providers/CanvasEventsProvider';
import { useMessageService } from '../../../../services/MessageService';
import { useGrid } from '../../../../providers/GridProvider';
import {
  DEFAULT_ELEMENT_PROFILES,
  EditorTool,
  EditorToolId,
  ElementLayout,
  getElementTypeDefinition,
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
  const definition = elementType ? getElementTypeDefinition(elementType) : null;
  const elementWidth = elementType ? DEFAULT_ELEMENT_PROFILES[elementType].layout.width : 1;
  const elementHeight = elementType ? DEFAULT_ELEMENT_PROFILES[elementType].layout.height : 1;
  const canvas = document.querySelector('.editor-canvas') as HTMLElement | null;

  const initialPosition = {
    xPos: 0,
    yPos: Math.max(
      0,
      Math.floor(
        (window.innerHeight / 2 - metrics.top + (canvas?.scrollTop ?? 0)) / cellSize.height,
      ),
    ),
  };

  const [overlayState, setOverlayState] = useState<OverlayState | null>(initialPosition);

  const getGridPosition = (clientX: number, clientY: number) => {
    const rect = canvas?.getBoundingClientRect();
    const relativeX = clientX - (rect?.left ?? metrics.left);
    const relativeY = clientY - (rect?.top ?? metrics.top);
    const scrollLeft = canvas?.scrollLeft ?? 0;
    const scrollTop = canvas?.scrollTop ?? 0;

    const xPos = Math.max(0, Math.floor((relativeX + scrollLeft) / cellSize.width));
    const yPos = Math.max(0, Math.floor((relativeY + scrollTop) / cellSize.height));

    return { xPos, yPos };
  };

  const applyAddConstraints = (layout: ElementLayout): ElementLayout => {
    if (!definition) {
      return layout;
    }

    switch (definition.placement) {
      case 'fullRow':
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
          if (!elementType) {
            return;
          }

          const raw = getGridPosition(event.clientX, event.clientY);

          const preview = applyAddConstraints({
            ...raw,
            width: elementWidth,
            height: elementHeight,
          });
          setOverlayState({ xPos: preview.xPos, yPos: preview.yPos });
        },

        pointerDown: (event) => {
          if (!elementType) {
            return;
          }

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
      [messages, metrics, cellSize, elementType, elementWidth, elementHeight, definition],
    ),
  );

  if (!overlayState || !elementType) {
    return null;
  }

  const previewElement = {
    id: 'add-element-preview',
    type: elementType,
    layout: {
      xPos: overlayState.xPos,
      yPos: overlayState.yPos,
      width: elementWidth,
      height: elementHeight,
    },
    style: {
      visible: true,
    },
    data: {
      ...structuredClone(DEFAULT_ELEMENT_PROFILES[elementType].data),
      ...(elementType === 'image' && previewImageUrl
        ? {
            src: previewImageUrl,
            content: '',
            title: imageData?.name,
            altText: imageData?.name,
            configuredWidth: false,
          }
        : {}),
    },
  } as EditorElement;

  return (
    <AddOverlay
      element={previewElement}
      x={overlayState.xPos * cellSize.width}
      y={overlayState.yPos * cellSize.height}
      width={elementWidth * cellSize.width}
      height={elementHeight * cellSize.height}
    />
  );
}
