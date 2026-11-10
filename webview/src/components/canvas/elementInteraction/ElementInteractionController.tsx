import { EditorElement, EditorElementType } from '5board.vsc-common';
import { useLayoutEffect, useRef } from 'react';
import { useGrid } from '../../../providers/GridProvider';
import { ELEMENT_INTERACTION_CONFIG, ElementInteractionProfile } from './InteractionConfig';
import Moveable, {
  OnDrag,
  OnDragEnd,
  OnResize,
  OnResizeEnd,
  OnRotate,
  OnRotateEnd,
} from 'react-moveable';
import { useMessageService } from '../../../services/MessageService';
import { constrainTranslation, snapTranslationToGrid } from './interactionUtils';

type Props<T extends EditorElementType> = {
  element: EditorElement<T>;
  selected: boolean | undefined;
  targetRef: React.RefObject<HTMLDivElement>;
  minHeight?: number;
  isMermaidPanMode?: boolean;
};

export default function ElementInteractionController<ElementType extends EditorElementType>({
  element,
  selected,
  targetRef,
  minHeight,
  isMermaidPanMode = false,
}: Props<ElementType>) {
  const moveableRef = useRef<Moveable | null>(null);
  const { cellSize, metrics } = useGrid();

  const profile: ElementInteractionProfile = ELEMENT_INTERACTION_CONFIG[element.type];
  const messages = useMessageService();

  const pendingPositionUpdate = useRef(false);
  const currentTranslate = useRef({ x: 0, y: 0 });
  const currentRotation = useRef(element.layout.rotation ?? 0);

  const applyTargetTransform = (
    target: HTMLElement | SVGElement,
    x: number,
    y: number,
    rotation = currentRotation.current,
  ) => {
    currentTranslate.current = { x, y };
    target.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
  };

  const getImageResizeRatio = () => {
    if (element.type === EditorElementType.Image) {
      const imageElement = element as EditorElement<EditorElementType.Image>;

      if (imageElement.data.aspectRatio !== undefined) {
        return imageElement.data.aspectRatio;
      }
    }

    return (element.layout.width * cellSize.width) / (element.layout.height * cellSize.height);
  };

  const isImageCornerResize = (direction: number[]) =>
    element.type === EditorElementType.Image && direction[0] !== 0 && direction[1] !== 0;

  const columnCount = Math.max(1, Math.round(metrics.width / cellSize.width));

  const clampHorizontalPosition = (xPos: number, width: number) =>
    Math.max(0, Math.min(xPos, columnCount - width));

  useLayoutEffect(() => {
    currentRotation.current = element.layout.rotation ?? 0;

    if (pendingPositionUpdate.current && targetRef.current) {
      pendingPositionUpdate.current = false;
      targetRef.current.style.transform = `rotate(${currentRotation.current}deg)`;
      targetRef.current.style.width = '';
      targetRef.current.style.height = '';
      currentTranslate.current = { x: 0, y: 0 };
    }
    if (selected) {
      moveableRef.current?.updateRect();
    }
  }, [
    selected,
    element.layout.xPos,
    element.layout.yPos,
    element.layout.width,
    element.layout.height,
    element.layout.rotation,
  ]);

  const handleDrag = ({ target, beforeTranslate }: OnDrag) => {
    const [rawX, y] = beforeTranslate;
    const minX = -element.layout.xPos * cellSize.width;
    const maxX = (columnCount - element.layout.xPos - element.layout.width) * cellSize.width;
    const x = Math.max(minX, Math.min(rawX, maxX));

    switch (profile.dragDirection) {
      case 'vertical':
        applyTargetTransform(target, 0, y);
        break;

      case 'horizontal':
        applyTargetTransform(target, x, 0);
        break;

      case 'free':
        applyTargetTransform(target, x, y);
        break;
    }
  };

  const handleDragEnd = ({ target, lastEvent }: OnDragEnd) => {
    if (!lastEvent || !target) return;
    const [rawX, rawY] = lastEvent.beforeTranslate;
    const [dx, dy] = constrainTranslation(element.type, rawX, rawY);
    const [rawXDelta, yDelta] = snapTranslationToGrid(dx, dy, cellSize);
    const xPos = clampHorizontalPosition(element.layout.xPos + rawXDelta, element.layout.width);
    const xDelta = xPos - element.layout.xPos;

    if (xDelta !== 0 || yDelta !== 0) {
      pendingPositionUpdate.current = true;
    }
    messages.send({
      type: 'updateElementsLayout',
      changes: [
        {
          id: element.id,
          changes: { xPos: element.layout.xPos + xDelta, yPos: element.layout.yPos + yDelta },
        },
      ],
    });
  };

  const handleResize = ({ target, width, height, direction }: OnResize) => {
    const nextWidth = width;
    let nextHeight = height;

    if (isImageCornerResize(direction)) {
      const ratio = getImageResizeRatio();
      nextHeight = nextWidth / ratio;
    }

    const maxWidth = Math.max(
      1,
      direction[0] < 0
        ? element.layout.xPos + element.layout.width
        : columnCount - element.layout.xPos,
    );
    const constrainedWidth = Math.max(
      cellSize.width,
      Math.min(maxWidth * cellSize.width, nextWidth),
    );
    const constrainedHeight = Math.max(
      cellSize.height,
      minHeight ?? 0,
      isImageCornerResize(direction) ? constrainedWidth / getImageResizeRatio() : nextHeight,
    );
    const x = direction[0] < 0 ? element.layout.width * cellSize.width - constrainedWidth : 0;
    const y = direction[1] < 0 ? element.layout.height * cellSize.height - constrainedHeight : 0;

    applyTargetTransform(target, x, y);
    target.style.width = `${constrainedWidth}px`;
    target.style.height = `${constrainedHeight}px`;
  };

  const handleRotate = ({ target, rotation }: OnRotate) => {
    applyTargetTransform(target, currentTranslate.current.x, currentTranslate.current.y, rotation);
  };

  const handleRotateEnd = ({ target, lastEvent }: OnRotateEnd) => {
    if (!lastEvent || !target) return;

    const rotation = Number(lastEvent.rotation ?? currentRotation.current);
    currentRotation.current = rotation;
    applyTargetTransform(target, currentTranslate.current.x, currentTranslate.current.y, rotation);

    if (rotation !== (element.layout.rotation ?? 0)) {
      messages.send({
        type: 'updateElementsLayout',
        changes: [
          {
            id: element.id,
            changes: {
              rotation,
            },
          },
        ],
      });
    }

    moveableRef.current?.updateRect();
  };

  const handleResizeEnd = ({ target, lastEvent }: OnResizeEnd) => {
    if (!lastEvent || !target) return;

    const width = lastEvent.width;
    let height = lastEvent.height;

    if (isImageCornerResize(lastEvent.direction)) {
      const ratio = getImageResizeRatio();
      height = width / ratio;
    }

    const maxWidth = Math.max(
      1,
      lastEvent.direction[0] < 0
        ? element.layout.xPos + element.layout.width
        : columnCount - element.layout.xPos,
    );
    const newWidth = Math.max(1, Math.min(maxWidth, Math.round(width / cellSize.width)));
    const minRows = minHeight === undefined ? 1 : Math.ceil(minHeight / cellSize.height);
    const newHeight = Math.max(minRows, Math.round(height / cellSize.height));
    const xDelta = lastEvent.direction[0] < 0 ? element.layout.width - newWidth : 0;
    const yDelta = lastEvent.direction[1] < 0 ? element.layout.height - newHeight : 0;

    if (
      newWidth !== element.layout.width ||
      newHeight !== element.layout.height ||
      xDelta !== 0 ||
      yDelta !== 0
    ) {
      pendingPositionUpdate.current = true;

      messages.send({
        type: 'updateElementsLayout',
        changes: [
          {
            id: element.id,
            changes: {
              width: newWidth,
              height: newHeight,
              xPos: element.layout.xPos + xDelta,
              yPos: element.layout.yPos + yDelta,
            },
          },
        ],
      });
    }

    moveableRef.current?.updateRect();
  };

  if (!selected) return null;

  return (
    <Moveable
      ref={moveableRef}
      target={targetRef}
      draggable={profile.draggable && !isMermaidPanMode}
      resizable={profile.resizable}
      rotatable={profile.rotatable}
      keepRatio={profile.keepRatio}
      snappable={true}
      snapGridWidth={cellSize.width}
      snapGridHeight={cellSize.height}
      snapThreshold={cellSize.width / 2}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onResize={handleResize}
      onResizeEnd={handleResizeEnd}
      onRotate={handleRotate}
      onRotateEnd={handleRotateEnd}
    />
  );
}
