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

  const { cellSize, metrics } = useGrid();
  const messages = useMessageService();

  const selectedElements = useMemo(
    () => elements.filter((element) => selectedElementIds.includes(element.id)),
    [elements, selectedElementIds],
  );

  const translationsRef = useRef(new Map<string, [number, number]>());

  const columnCount = Math.max(1, Math.round(metrics.width / cellSize.width));
  const groupStart = Math.min(...selectedElements.map((element) => element.layout.xPos));
  const groupEnd = Math.max(
    ...selectedElements.map((element) => element.layout.xPos + element.layout.width),
  );

  const clampGroupTranslation = (x: number, y: number): [number, number] => {
    const minX = -groupStart * cellSize.width;

    const maxX = (columnCount - groupEnd) * cellSize.width;

    return [Math.max(minX, Math.min(x, maxX)), y];
  };

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
    const firstEvent = events[0];

    if (!firstEvent) {
      return;
    }

    let [groupX, groupY] = firstEvent.beforeTranslate;

    const constrainedTranslations = selectedElements.map((element) =>
      constrainTranslation(element.type, groupX, groupY),
    );

    if (constrainedTranslations.length > 0) {
      const allowsX = constrainedTranslations.some(([x]) => x !== 0);

      const allowsY = constrainedTranslations.some(([, y]) => y !== 0);

      if (!allowsX) {
        groupX = 0;
      }

      if (!allowsY) {
        groupY = 0;
      }
    }

    [groupX, groupY] = clampGroupTranslation(groupX, groupY);

    for (const event of events) {
      event.target.style.transform = `translate(${groupX}px, ${groupY}px)`;

      translationsRef.current.set(event.target.id, [groupX, groupY]);
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
