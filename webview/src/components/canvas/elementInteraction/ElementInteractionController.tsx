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

  useLayoutEffect(() => {
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
      console.log('persisted position on drag end', element.id, {
        xPos: element.layout.xPos + xDelta,
        yPos: element.layout.yPos + yDelta,
      });
    }

    if (target instanceof HTMLElement) {
      target.style.transform = '';
    }
    moveableRef.current?.updateRect();
  };

  const handleResizeEnd = ({ target, lastEvent }: OnResizeEnd) => {
    if (!lastEvent || !target) return;
    const width = lastEvent.width;
    const height = lastEvent.height;
    const newWidth = Math.max(1, Math.round(width / cellSize.width));
    const newHeight = Math.max(1, Math.round(height / cellSize.height));

    if (newWidth !== element.layout.width || newHeight !== element.layout.height) {
      messages.send({
        type: 'updateElementLayout',
        id: element.id,
        changes: {
          width: newWidth,
          height: newHeight,
        },
      });
      console.log('persisted resize on resize end', element.id, {
        width: newWidth,
        height: newHeight,
      });
    }

    if (target instanceof HTMLElement) {
      target.style.width = '';
      target.style.height = '';
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
      onResize={({ target, width, height }) => {
        target.style.width = `${width}px`;
        target.style.height = `${height}px`;
      }}
      onResizeEnd={handleResizeEnd}
    />
  );
}
