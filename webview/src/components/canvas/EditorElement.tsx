import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { EditorElement, EditorElementType } from '5board.vsc-common';
import Moveable from 'react-moveable';
import type React from 'react';
import { TextElement } from './elements/TextElement';
import { HeadingElement } from './elements/HeadingElement';
import { getGridCellSize } from '../../util';

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
  const [canvasElement, setCanvasElement] = useState<HTMLElement | null>(null);
  const ElementComponent = ELEMENT_COMPONENTS[element.type] as React.ComponentType<
    EditorElementProps<ElementType>
  >;

  const cellSize = useMemo(() => getGridCellSize(canvasElement), [canvasElement]);

  useLayoutEffect(() => {
    setCanvasElement(targetRef.current?.closest('.editor-canvas') as HTMLElement | null);
  }, [element.id]);

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
      <div
        onClick={() => onSelect?.(element.id)}
        className={`editor-element editor-element-hover ${selected ? 'editor-element-selected' : ''} pl-editor font-bold`}
        ref={targetRef}
        style={{
          gridRowStart: element.layout.yPos + 1,
          gridRowEnd: `span ${element.layout.height}`,
          gridColumnStart: element.layout.xPos + 1,
          gridColumnEnd: `span ${element.layout.width}`,
        }}
      >
        <ElementComponent
          element={element}
          targetRef={targetRef}
          selected={selected}
          onSelect={onSelect}
        />
      </div>
      {selected && (
        <Moveable
          ref={moveableRef}
          target={targetRef}
          draggable={true}
          resizable={true}
          snappable={true}
          snapGridWidth={cellSize.width}
          snapGridHeight={cellSize.height}
          snapThreshold={cellSize.width / 2}
          onDrag={({ target, transform }) => {
            target.style.transform = transform;
          }}
          onDragEnd={({ target, lastEvent }) => {
            if (!lastEvent || !target) return;
            const [dx, dy] = lastEvent.beforeTranslate;
            const xDelta = Math.round(dx / cellSize.width);
            const yDelta = Math.round(dy / cellSize.height);

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
          onResizeEnd={({ target, lastEvent }) => {
            if (!lastEvent || !target) return;
            const width = lastEvent.width;
            const height = lastEvent.height;
            const newWidth = Math.max(1, Math.round(width / cellSize.width));
            const newHeight = Math.max(1, Math.round(height / cellSize.height));

            if (newWidth !== element.layout.width || newHeight !== element.layout.height) {
              onUpdateLayout?.(element.id, {
                width: newWidth,
                height: newHeight,
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
  [EditorElementType.Text]: TextElement,
} as const satisfies {
  [ElementType in EditorElementType]: React.ComponentType<EditorElementProps<ElementType>>;
};
