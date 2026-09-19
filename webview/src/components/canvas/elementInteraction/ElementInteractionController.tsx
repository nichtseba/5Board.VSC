import { EditorElement, EditorElementType } from '5board.vsc-common';
import { useLayoutEffect, useRef } from 'react';
import { useGrid } from '../../../providers/GridProvider';
import { ELEMENT_INTERACTION_CONFIG, ElementInteractionProfile } from './InteractionConfig';
import Moveable, { OnDragEnd, OnResizeEnd } from 'react-moveable';
import { useMessageService } from '../../../services/MessageService';
import { constrainTranslation, snapTranslationToGrid } from './interactionUtils';

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
    const [dx, dy] = constrainTranslation(
      element.type,
      lastEvent.beforeTranslate[0],
      lastEvent.beforeTranslate[1],
    );
    const [xDelta, yDelta] = snapTranslationToGrid(dx, dy, cellSize);

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

  const handleResizeEnd = ({ target, lastEvent }: OnResizeEnd) => {
    if (!lastEvent || !target) return;

    const width = lastEvent.width;
    let height = lastEvent.height;

    if (isImageCornerResize(lastEvent.direction)) {
      const ratio = getImageResizeRatio();
      height = width / ratio;
    }

    const newWidth = Math.max(1, Math.round(width / cellSize.width));
    const newHeight = Math.max(1, Math.round(height / cellSize.height));

    if (newWidth !== element.layout.width || newHeight !== element.layout.height) {
      pendingPositionUpdate.current = true;

      messages.send({
        type: 'updateElementsLayout',
        changes: [
          {
            id: element.id,
            changes: {
              width: newWidth,
              height: newHeight,
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
      draggable={profile.draggable}
      resizable={profile.resizable}
      snappable={true}
      snapGridWidth={cellSize.width}
      snapGridHeight={cellSize.height}
      snapThreshold={cellSize.width / 2}
      onDrag={({ target, beforeTranslate }) => {
        const [x, y] = constrainTranslation(element.type, beforeTranslate[0], beforeTranslate[1]);
        target.style.transform = `translate(${x}px, ${y}px)`;
      }}
      onDragEnd={handleDragEnd}
      onResize={({ target, width, height, direction }) => {
        const nextWidth = width;
        let nextHeight = height;

        if (isImageCornerResize(direction)) {
          const ratio = getImageResizeRatio();
          nextHeight = nextWidth / ratio;
        }

        target.style.width = `${nextWidth}px`;
        target.style.height = `${nextHeight}px`;
      }}
      onResizeEnd={handleResizeEnd}
    />
  );
}
