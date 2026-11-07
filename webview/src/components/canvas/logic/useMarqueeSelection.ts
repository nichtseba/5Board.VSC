import { useRef, useState } from 'react';

import {
  BoardElement,
  EditorElement,
  EditorToolId,
  findTopLevelBoardElement,
} from '5board.vsc-common';

import { useCanvasEvents, useCanvasPoint } from '../../../providers/CanvasEventsProvider';

import { useGrid } from '../../../providers/GridProvider';
import { MessageService } from '../../../services/MessageService';

type Point = {
  x: number;
  y: number;
};

type MarqueeRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const MARQUEE_START_THRESHOLD = 4;

export function useMarqueeSelection({
  activeToolId,
  elements,
  boardElements,
  messages,
}: {
  activeToolId?: string;
  elements: EditorElement[];
  boardElements: BoardElement[];
  messages: MessageService;
}) {
  /**
   * The initial pointer position in normalized canvas coordinates.
   *
   * This is set on pointerDown, but does not immediately start a marquee selection.
   */
  const startRef = useRef<Point | null>(null);

  /**
   * The pointer position in screen/client coordinates at pointerDown.
   *
   * This is used to distinguish a normal click from an actual drag.
   */
  const startClientRef = useRef<Point | null>(null);

  /**
   * True only after the pointer has moved far enough to start
   * a marquee selection.
   */
  const isMarqueeActiveRef = useRef(false);

  /**
   * True when selection started on an element.
   *
   * This is used to distinguish moving an element from starting a new marquee selection.
   */
  const startedOnElementRef = useRef(false);

  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);

  const toCanvasPoint = useCanvasPoint();
  const { cellSize, metrics } = useGrid();

  /**
   * Converts a normalized canvas point (0–1)
   * into grid coordinates.
   */
  const toGridPoint = (point: Point): Point => {
    if (metrics.width <= 0 || metrics.height <= 0 || cellSize.width <= 0 || cellSize.height <= 0) {
      return {
        x: 0,
        y: 0,
      };
    }

    const pixelX = point.x * metrics.width;
    const pixelY = point.y * metrics.height;

    return {
      x: pixelX / cellSize.width,
      y: pixelY / cellSize.height,
    };
  };

  /**
   * Checks intersection using grid coordinates.
   *
   * element.layout and rect are both expressed
   * in grid units.
   */
  const intersectsRect = (element: EditorElement, rect: MarqueeRect) => {
    const ex = element.layout.xPos;
    const ey = element.layout.yPos;
    const ew = element.layout.width;
    const eh = element.layout.height;

    return (
      ex < rect.x + rect.width && ex + ew > rect.x && ey < rect.y + rect.height && ey + eh > rect.y
    );
  };

  /**
   * Creates a rectangle from two points.
   *
   * The points must use the same coordinate system.
   */
  const createRect = (start: Point, current: Point): MarqueeRect => ({
    x: Math.min(start.x, current.x),
    y: Math.min(start.y, current.y),
    width: Math.abs(current.x - start.x),
    height: Math.abs(current.y - start.y),
  });

  const cancelMarquee = () => {
    startRef.current = null;
    startClientRef.current = null;
    isMarqueeActiveRef.current = false;
    startedOnElementRef.current = false;
    setMarqueeRect(null);
  };

  useCanvasEvents({
    pointerDown: (event) => {
      console.log('[Marquee Debug] pointerDown', {
        target: event.target,
        editorElement: (event.target as HTMLElement).closest('[data-editor-element]'),
        moveableControl: (event.target as HTMLElement).closest('.moveable-control-box'),
        startedOnElement: startedOnElementRef.current,
      });
      if (activeToolId !== EditorToolId.POINTER) return;
      if (event.button !== 0) return;

      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      // Don't treat intern Canvas UI elements as empty spaces
      if (target.closest('[data-canvas-ui]')) return;

      const element = target.closest('[data-editor-element]');
      if (element) {
        startedOnElementRef.current = true;
        return;
      }

      const moveableControl = target.closest('.moveable-control-box');
      if (moveableControl) {
        return;
      }

      const point = toCanvasPoint(event);

      if (!point) {
        return;
      }

      //remember starting point
      startRef.current = point;

      startClientRef.current = { x: event.clientX, y: event.clientY };
    },

    pointerMove: (event) => {
      if (
        startedOnElementRef.current ||
        !startRef.current ||
        !startClientRef.current ||
        activeToolId !== EditorToolId.POINTER
      ) {
        return;
      }

      const point = toCanvasPoint(event);

      if (!point) {
        return;
      }

      // Determine whether the pointer has moved far enough
      // to turn the click into a marquee drag.
      // Uses client coordinates because the threshold
      // should be independent of canvas size and normalization.
      const deltaX = event.clientX - startClientRef.current.x;
      const deltaY = event.clientY - startClientRef.current.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // start marquee only when pointer has moved far enough
      if (distance >= MARQUEE_START_THRESHOLD) {
        isMarqueeActiveRef.current = true;
        //rectangle from normalized coordinates for rendering
        setMarqueeRect(createRect(startRef.current, point));
      } else {
        return;
      }
    },

    pointerUp: (event) => {
      console.log('[Marquee Debug] pointerUp', {
        target: event.target,
        startedOnElement: startedOnElementRef.current,
        hasStart: !!startRef.current,
        isMarqueeActive: isMarqueeActiveRef.current,
      });
      if (
        !startRef.current ||
        activeToolId !== EditorToolId.POINTER ||
        startedOnElementRef.current
      ) {
        cancelMarquee();
        return;
      }

      const point = toCanvasPoint(event);

      // clean up when pointer position cannot be determined
      if (!point) {
        cancelMarquee();
        return;
      }

      // clean up when the pointer never moved far enough
      // this means this was a simple click on empty canvas,
      // therefore the selection should be cleared
      if (!isMarqueeActiveRef.current) {
        messages.send({
          type: 'selectElements',
          ids: [],
        });
        cancelMarquee();
        return;
      }

      //normalized to grid coordinates
      const gridStart = toGridPoint(startRef.current);
      const gridCurrent = toGridPoint(point);

      //rectangle from grid coordinates for intersection
      const gridRect = createRect(gridStart, gridCurrent);

      const ids = [
        ...new Set(
          elements
            .filter((element) => intersectsRect(element, gridRect))
            .map(
              (element) => findTopLevelBoardElement(boardElements, element.id)?.id ?? element.id,
            ),
        ),
      ];

      if (event?.shiftKey) {
        console.log('[Selection Debug] Clearing selection via pointerUp', {
          target: event.target,
          startedOnElement: startedOnElementRef.current,
          isMarqueeActive: isMarqueeActiveRef.current,
        });
        messages.send({ type: 'toggleElementSelection', ids: ids });
      } else {
        messages.send({
          type: 'selectElements',
          ids,
        });
      }

      //clean up
      cancelMarquee();
    },
    pointerCancel: () => {
      cancelMarquee();
    },
  });

  return {
    marqueeRect,
  };
}
