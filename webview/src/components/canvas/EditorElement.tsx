import { useLayoutEffect, useRef } from 'react';
import { EditorElement, EditorElementType } from '5board.vsc-common';
import Moveable from 'react-moveable';
import { HeadingElement } from './elements/HeadingElement';

export type EditorElementProps<T extends EditorElementType> = {
  element: EditorElement<T>;
  onSelect?: (id: string) => void;
  selected?: boolean;
  targetRef?: React.RefObject<HTMLDivElement>;
  onUpdateLayout?: (id: string, changes: Partial<EditorElement<T>['layout']>) => void;
};

/**
 * Renders an editor element based on its type. The actual rendering logic for each element type is delegated to specific components (e.g., HeadingElement for heading elements).
 * Uses {@link ELEMENT_COMPONENTS} to determine which component to render for each element type.
 *
 * The moveable interaction behavior is centralized here so every editor element can be moved when selected.
 */
export default function EditorElement<ElementType extends EditorElementType>({
  element,
  onSelect,
  selected,
  onUpdateLayout,
}: EditorElementProps<ElementType>) {
  const targetRef = useRef<HTMLDivElement>(null);
  const moveableRef = useRef<Moveable | null>(null);
  const ElementComponent = ELEMENT_COMPONENTS[element.type] as React.ComponentType<
    EditorElementProps<ElementType>
  >;

  const getGridCellSize = () => {
    const canvas = targetRef.current?.closest('.editor-canvas') as HTMLElement | null;
    if (!canvas) return { width: 1, height: 1 };

    const style = getComputedStyle(canvas);
    const parsePx = (value: string) => Number(value.replace('px', '').trim()) || 0;

    const columns = parseInt(style.getPropertyValue('--editor-columns')) || 1;
    const templateColumns = style.getPropertyValue('grid-template-columns');
    const columnWidth = parsePx(templateColumns.split(' ')[0]) || canvas.clientWidth / columns || 1;
    const rowHeight = parsePx(style.getPropertyValue('grid-auto-rows')) || columnWidth;

    return { width: columnWidth, height: rowHeight };
  };
  const cellSize = getGridCellSize();

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

  return (
    <>
      <ElementComponent
        element={element}
        onSelect={onSelect}
        selected={selected}
        targetRef={targetRef}
        onUpdateLayout={onUpdateLayout}
      />
      {selected && (
        <Moveable
          ref={moveableRef}
          target={targetRef}
          draggable={true}
          resizable={true}
          snappable={true}
          snapGridWidth={cellSize.width}
          snapGridHeight={cellSize.height}
          onDrag={({ target, transform }) => {
            target.style.transform = transform;
          }}
          onDragEnd={({ target, lastEvent }) => {
            if (!lastEvent || !target) return;
            const [dx, dy] = lastEvent.beforeTranslate;
            const gridSize = getGridCellSize();
            const xDelta = Math.round(dx / gridSize.width);
            const yDelta = Math.round(dy / gridSize.height);

            if (xDelta !== 0 || yDelta !== 0) {
              onUpdateLayout?.(element.id, {
                xPos: element.layout.xPos + xDelta,
                yPos: element.layout.yPos + yDelta,
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
          }}
          onResize={({ target, width, height }) => {
            target.style.width = `${width}px`;
            target.style.height = `${height}px`;
          }}
        />
      )}
    </>
  );
}

/**
 * Mapping of editor element types to their corresponding React components.
 */
const ELEMENT_COMPONENTS = {
  [EditorElementType.Heading]: HeadingElement,
} as const satisfies {
  [ElementType in EditorElementType]: React.ComponentType<EditorElementProps<ElementType>>;
};
