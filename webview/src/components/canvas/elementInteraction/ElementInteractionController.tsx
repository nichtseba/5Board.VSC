import { EditorElement, EditorElementType } from '5board.vsc-common';
import { useLayoutEffect, useRef } from 'react';
import { useGrid } from '../../../providers/GridProvider';
import { ELEMENT_INTERACTION_CONFIG, ElementInteractionProfile } from './InteractionConfig';
import Moveable, { OnDragEnd, OnResizeEnd } from 'react-moveable';
import { useMessageService } from '../../../services/MessageService';

type Props<T extends EditorElementType> = {
  element: EditorElement<T>;
  selected: boolean | undefined;
  targetRef: React.RefObject<HTMLDivElement>;
};

export default function ElementInteractionController<ElementType extends EditorElementType>({
  element,
  selected,
  targetRef,
}: Props<ElementType>) {
  const moveableRef = useRef<Moveable | null>(null);
  const { cellSize } = useGrid();

  const profile: ElementInteractionProfile = ELEMENT_INTERACTION_CONFIG[element.type];
  const messages = useMessageService();

  const pendingPositionUpdate = useRef(false);

  const getCurrentElementRatio = () =>
    (element.layout.width * cellSize.width) / (element.layout.height * cellSize.height);

  const isImageCornerResize = (direction: number[]) =>
    element.type === EditorElementType.Image && direction[0] !== 0 && direction[1] !== 0;

  useLayoutEffect(() => {
    if (pendingPositionUpdate.current && targetRef.current) {
      pendingPositionUpdate.current = false;
      targetRef.current.style.transform = '';
      targetRef.current.style.width = '';
      targetRef.current.style.height = '';
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
  ]);

  const handleDragEnd = ({ target, lastEvent }: OnDragEnd) => {
    if (!lastEvent || !target) return;
    const [dx, dy] = lastEvent.beforeTranslate;
    let xDelta = Math.round(dx / cellSize.width);
    let yDelta = Math.round(dy / cellSize.height);

    if (xDelta !== 0 || yDelta !== 0) {
      pendingPositionUpdate.current = true;
      switch (profile.dragDirection) {
        case 'vertical':
          xDelta = 0;
          break;
        case 'horizontal':
          yDelta = 0;
          break;
      }
      messages.send({
        type: 'updateElementLayout',
        id: element.id,
        changes: {
          xPos: element.layout.xPos + xDelta,
          yPos: element.layout.yPos + yDelta,
        },
      });
    }

    moveableRef.current?.updateRect();
  };

  const handleResizeEnd = ({ target, lastEvent }: OnResizeEnd) => {
    if (!lastEvent || !target) return;

    const width = lastEvent.width;
    let height = lastEvent.height;

    if (isImageCornerResize(lastEvent.direction)) {
      const ratio = getCurrentElementRatio();
      height = width / ratio;
    }

    const newWidth = Math.max(1, Math.round(width / cellSize.width));
    const newHeight = Math.max(1, Math.round(height / cellSize.height));

    if (newWidth !== element.layout.width || newHeight !== element.layout.height) {
      pendingPositionUpdate.current = true;

      messages.send({
        type: 'updateElementLayout',
        id: element.id,
        changes: {
          width: newWidth,
          height: newHeight,
        },
      });
    }

    moveableRef.current?.updateRect();
  };

  if (!selected) return null;

  return (
    <Moveable
      ref={moveableRef}
      target={targetRef}
      draggable={profile.draggable}
      resizable={profile.resizable}
      snappable={true}
      snapGridWidth={cellSize.width}
      snapGridHeight={cellSize.height}
      snapThreshold={cellSize.width / 2}
      onDrag={({ target, beforeTranslate }) => {
        const [x, y] = beforeTranslate;

        switch (profile.dragDirection) {
          case 'vertical':
            target.style.transform = `translate(0px, ${y}px)`;
            break;

          case 'horizontal':
            target.style.transform = `translate(${x}px, 0px)`;
            break;

          case 'free':
            target.style.transform = `translate(${x}px, ${y}px)`;
            break;
        }
      }}
      onDragEnd={handleDragEnd}
      onResize={({ target, width, height, direction }) => {
        const nextWidth = width;
        let nextHeight = height;

        if (isImageCornerResize(direction)) {
          const ratio = getCurrentElementRatio();
          nextHeight = nextWidth / ratio;
        }

        target.style.width = `${nextWidth}px`;
        target.style.height = `${nextHeight}px`;
      }}
      onResizeEnd={handleResizeEnd}
    />
  );
}
