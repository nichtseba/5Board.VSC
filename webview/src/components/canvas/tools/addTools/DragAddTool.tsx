import { useEffect, useMemo, useState } from 'react';
import { useCanvasEvents } from '../../../../providers/CanvasEventsProvider';
import { useMessageService } from '../../../../services/MessageService';
import { useGrid } from '../../../../providers/GridProvider';
import {
  DEFAULT_ELEMENT_PROFILES,
  EditorElement,
  EditorElementType,
  EditorTool,
  EditorToolId,
  ElementLayout,
  getElementTypeDefinition,
  ImageElementData,
} from '5board.vsc-common';
import AddOverlay from './AddOverlay';
import { useEditorState } from '../../../../providers/EditorStateProvider';
/**
 * DragAddTool
 *
 * Handles adding a new element to a specific location.
 * The preview follows the mouse and snaps to the grid.
 * Clicking places the element and exits the tool.
 */
export function DragAddTool() {
  const messages = useMessageService();
  const { cellSize, metrics } = useGrid();
  const editorState = useEditorState();

  const elementType = (editorState.tool as EditorTool<EditorToolId.AddElement>).parameters?.type;
  const addToolParameters = (editorState.tool as EditorTool<EditorToolId.AddElement>).parameters;
  const defaults = addToolParameters?.defaults;
  const fixedXPosition = addToolParameters?.fixedXPosition;

  const imageAsset = defaults?.asset;
  const definition = elementType ? getElementTypeDefinition(elementType) : null;
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

  const [overlayState, setOverlayState] = useState<{ xPos: number; yPos: number } | null>(
    initialPosition,
  );

  const previewImageUrl = useMemo(() => {
    if (elementType !== EditorElementType.Image || !imageAsset) {
      return undefined;
    }

    return URL.createObjectURL(new Blob([new Uint8Array(imageAsset.bytes)]));
  }, [elementType, imageAsset]);

  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    setImageSize(null);

    if (!previewImageUrl || elementType !== EditorElementType.Image) {
      return;
    }

    const image = new Image();
    image.onload = () => {
      setImageSize({
        width: Math.max(1, Math.round(image.naturalWidth / cellSize.width)),
        height: Math.max(1, Math.round(image.naturalHeight / cellSize.height)),
      });
    };
    image.src = previewImageUrl;

    return () => {
      image.onload = null;
    };
  }, [previewImageUrl, elementType, cellSize]);

  useEffect(() => {
    return () => {
      if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl);
      }
    };
  }, [previewImageUrl]);

  const elementWidth = elementType
    ? (defaults?.layout?.width ??
      imageSize?.width ??
      DEFAULT_ELEMENT_PROFILES[elementType].layout.width)
    : 1;
  const elementHeight = elementType
    ? (defaults?.layout?.height ??
      imageSize?.height ??
      DEFAULT_ELEMENT_PROFILES[elementType].layout.height)
    : 1;

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

    if (fixedXPosition !== undefined) {
      return { ...layout, xPos: fixedXPosition };
    }

    if (definition.placement === 'fullRow') {
      return {
        ...layout,
        xPos: 0,
      };
    }

    return layout;
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
            defaults: {
              ...defaults,
              layout: {
                ...defaults?.layout,
                width: elementWidth,
                height: elementHeight,
              },
            },
          });
        },
      }),
      [
        messages,
        metrics,
        cellSize,
        elementType,
        elementWidth,
        elementHeight,
        definition,
        defaults,
        fixedXPosition,
      ],
    ),
  );

  if (!overlayState || !elementType) {
    return null;
  }

  const imageDefaults =
    elementType === EditorElementType.Image
      ? (defaults?.data as Partial<ImageElementData> | undefined)
      : undefined;

  const previewElement = {
    id: 'add-element-preview',
    type: elementType,
    layout: {
      xPos: overlayState.xPos,
      yPos: overlayState.yPos,
      width: elementWidth,
      height: elementHeight,
    },
    style: defaults?.style ?? { visible: true },
    data: {
      ...structuredClone(DEFAULT_ELEMENT_PROFILES[elementType].data),
      ...defaults?.data,
      ...(elementType === 'image' && previewImageUrl
        ? {
            src: previewImageUrl,
            content: '',
            title: imageDefaults?.title ?? imageAsset?.name,
            altText: imageDefaults?.altText ?? imageAsset?.name,
            configuredWidth: false,
          }
        : {}),
    },
  } as EditorElement;

  return <AddOverlay element={previewElement} />;
}
