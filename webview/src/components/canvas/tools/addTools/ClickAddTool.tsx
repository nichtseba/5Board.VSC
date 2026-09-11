import { useMemo, useState } from 'react';
import { useCanvasEvents } from '../../../../providers/CanvasEventsProvider';
import { useMessageService } from '../../../../services/MessageService';
import { useGrid } from '../../../../providers/GridProvider';
import {
  EditorElementDataMap,
  EditorElementType,
  EditorTool,
  EditorToolId,
  ElementLayout,
  getElementTypeDefinition,
  WebviewToExtensionMessage,
} from '5board.vsc-common';
import { useEditorState } from '../../../../providers/EditorStateProvider';
import AddOverlay from './AddOverlay';
import ClickOverlay from './ClickOverlay';

type Point = {
  x: number;
  y: number;
};

type Preview<T extends EditorElementType> = {
  layout: ElementLayout;
  data: Partial<EditorElementDataMap[T]>;
};

type ClickPreview =
  | Preview<EditorElementType.Line>
  | Preview<EditorElementType.Rectangle>
  | Preview<EditorElementType.Circle>;

export function ClickAddTool() {
  const messages = useMessageService();
  const { cellSize, metrics } = useGrid();
  const editorState = useEditorState();

  const elementType = (editorState.tool as EditorTool<EditorToolId.AddElement>).parameters?.type;

  const definition = elementType ? getElementTypeDefinition(elementType) : null;

  const canvas = document.querySelector('.editor-canvas') as HTMLElement | null;

  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);

  /**
   * Converts a mouse position into a position on the editor grid.
   */
  const getGridPosition = (clientX: number, clientY: number): Point => {
    const rect = canvas?.getBoundingClientRect();

    const relativeX = clientX - (rect?.left ?? metrics.left);

    const relativeY = clientY - (rect?.top ?? metrics.top);

    const scrollLeft = canvas?.scrollLeft ?? 0;
    const scrollTop = canvas?.scrollTop ?? 0;

    return {
      x: Math.max(0, Math.floor((relativeX + scrollLeft) / cellSize.width)),
      y: Math.max(0, Math.floor((relativeY + scrollTop) / cellSize.height)),
    };
  };

  /**
   * Creates a bounding box from two points for ElementLayout width and height.
   */
  const getBoundingBox = (start: Point, end: Point): ElementLayout => {
    return {
      xPos: Math.min(start.x, end.x),
      yPos: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
    };
  };

  /**
   * Creates line data from two points.
   *
   * The line points are stored relative to the line's
   * width and height using a 0-100 coordinate system.
   */
  const getLinePreview = (start: Point, end: Point): Preview<EditorElementType.Line> => {
    const boundingBox = getBoundingBox(start, end);

    const layout: ElementLayout = {
      ...boundingBox,
      width: Math.max(boundingBox.width, 1),
      height: Math.max(boundingBox.height, 1),
    };

    return {
      layout,
      data: {
        points: [
          {
            x: ((start.x - layout.xPos) / layout.width) * 100,
            y: ((start.y - layout.yPos) / layout.height) * 100,
          },
          {
            x: ((end.x - layout.xPos) / layout.width) * 100,
            y: ((end.y - layout.yPos) / layout.height) * 100,
          },
        ],
        headTypeEnd: 'none',
      },
    };
  };

  const createPreview = (type: EditorElementType, start: Point, end: Point): ClickPreview => {
    switch (type) {
      case EditorElementType.Line:
        return getLinePreview(start, end);

      case EditorElementType.Rectangle:
      case EditorElementType.Circle:
        return {
          layout: getBoundingBox(start, end),
          data: {},
        };

      default:
        return {
          layout: getBoundingBox(start, end),
          data: {},
        };
    }
  };

  /**
   * Applies the same placement constraints as the normal add tool.
   */
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

          const point = getGridPosition(event.clientX, event.clientY);
          setCurrentPoint(point);
        },

        pointerDown: (event) => {
          if (!elementType) {
            return;
          }

          const point = getGridPosition(event.clientX, event.clientY);

          /**
           * First click:
           * Remember the start point and wait for the second click.
           */
          if (!startPoint) {
            setStartPoint(point);
            setCurrentPoint(point);
            return;
          }

          /**
           * Second click:
           * Create the actual element.
           */
          const preview = createPreview(elementType, startPoint, point);
          const layout = applyAddConstraints(preview.layout);

          let message: WebviewToExtensionMessage;

          switch (elementType) {
            case EditorElementType.Line:
              message = {
                type: 'addElement',
                elementType: EditorElementType.Line,
                elementPosition: layout,
                initialData: {
                  data: (preview as Preview<EditorElementType.Line>)
                    .data as EditorElementDataMap[EditorElementType.Line],
                },
              };
              break;
            case EditorElementType.Rectangle:
              message = {
                type: 'addElement',
                elementType: EditorElementType.Rectangle,
                elementPosition: layout,
                initialData: {
                  data: undefined,
                },
              };
              break;
            case EditorElementType.Circle:
              message = {
                type: 'addElement',
                elementType: EditorElementType.Circle,
                elementPosition: layout,
                initialData: {
                  data: undefined,
                },
              };
              break;
            default:
              return;
          }

          messages.send(message);

          /**
           * Reset the tool for the next element.
           */
          setStartPoint(null);
          setCurrentPoint(null);
        },
      }),
      [messages, metrics, cellSize, elementType, startPoint, definition],
    ),
  );

  if (!elementType || !currentPoint) {
    return null;
  }

  /**
   * Before the first click there is no preview geometry.
   */
  if (!startPoint) {
    return (
      <AddOverlay
        x={currentPoint.x * cellSize.width}
        y={currentPoint.y * cellSize.height}
        width={cellSize.width}
        height={cellSize.height}
        variant="point"
      />
    );
  }

  const preview = createPreview(elementType, startPoint, currentPoint);

  const layout = applyAddConstraints(preview.layout);

  return (
    <ClickOverlay
      elementType={elementType}
      layout={layout}
      data={preview.data}
      cellSize={cellSize}
    />
  );
}
