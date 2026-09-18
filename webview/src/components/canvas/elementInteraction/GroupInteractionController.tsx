import { useEffect, useMemo, useRef, useState } from 'react';
import Moveable, { OnDragGroup, OnDragGroupEnd } from 'react-moveable';
import { EditorElement } from '5board.vsc-common';
import { useGrid } from '../../../providers/GridProvider';
import { useMessageService } from '../../../services/MessageService';
import { constrainTranslation, snapTranslationToGrid } from './interactionUtils';

type Props = {
  elements: EditorElement[];
  selectedElementIds: string[];
};

export default function GroupInteractionController({ elements, selectedElementIds }: Props) {
  const moveableRef = useRef<Moveable | null>(null);
  const [targets, setTargets] = useState<HTMLElement[]>([]);

  const { cellSize } = useGrid();
  const messages = useMessageService();

  const selectedElements = useMemo(
    () => elements.filter((element) => selectedElementIds.includes(element.id)),
    [elements, selectedElementIds],
  );

  const translationsRef = useRef(new Map<string, [number, number]>());

  useEffect(() => {
    const nextTargets = selectedElementIds
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element instanceof HTMLElement);

    setTargets(nextTargets);
  }, [selectedElementIds, elements]);

  useEffect(() => {
    moveableRef.current?.updateRect();
  }, [targets]);

  if (selectedElements.length < 2 || targets.length < 2) {
    return null;
  }

  const handleDragGroup = ({ events }: OnDragGroup) => {
    for (const event of events) {
      const element = selectedElements.find((element) => element.id === event.target.id);

      if (!element) {
        continue;
      }

      const [x, y] = constrainTranslation(
        element.type,
        event.beforeTranslate[0],
        event.beforeTranslate[1],
      );

      event.target.style.transform = `translate(${x}px, ${y}px)`;

      translationsRef.current.set(event.target.id, [x, y]);
    }
  };

  const handleDragGroupEnd = ({ events }: OnDragGroupEnd) => {
    const changes = [];

    for (const event of events) {
      const element = selectedElements.find((element) => element.id === event.target.id);

      if (!element) {
        continue;
      }

      const translation = translationsRef.current.get(event.target.id);

      if (!translation) {
        continue;
      }

      const [xDelta, yDelta] = snapTranslationToGrid(translation[0], translation[1], cellSize);

      if (xDelta !== 0 || yDelta !== 0) {
        changes.push({
          id: element.id,
          changes: {
            xPos: element.layout.xPos + xDelta,
            yPos: element.layout.yPos + yDelta,
          },
        });
      }

      event.target.style.transform = '';
    }

    translationsRef.current.clear();

    if (changes.length > 0) {
      messages.send({
        type: 'updateElementsLayout',
        changes,
      });
    }

    moveableRef.current?.updateRect();
  };

  return (
    <Moveable
      ref={moveableRef}
      target={targets}
      draggable
      groupable
      resizable={false}
      snappable
      snapGridWidth={cellSize.width}
      snapGridHeight={cellSize.height}
      snapThreshold={cellSize.width / 2}
      onDragGroup={handleDragGroup}
      onDragGroupEnd={handleDragGroupEnd}
    />
  );
}
