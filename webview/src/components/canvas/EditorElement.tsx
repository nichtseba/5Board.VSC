import { useEffect, useRef } from 'react';
import { EditorElement, EditorElementType, EditorToolId } from '5board.vsc-common';
import type React from 'react';
import { TextElement } from './elements/TextElement';
import { HeadingElement } from './elements/HeadingElement';
import ElementInteractionController from './elementInteraction/ElementInteractionController';
import { CodeElement } from './elements/CodeElement';
import { ImageElement } from './elements/ImageElement';
import { ShapeElement } from './elements/ShapeElement';
import { ArrowElement } from './elements/ArrowElement';
import { useMessageService } from '../../services/MessageService';

export type EditorElementProps<T extends EditorElementType> = {
  element: EditorElement<T>;
  onSelect?: (id: string) => void;
  selected?: boolean;
  targetRef?: React.RefObject<HTMLDivElement>;
  activeToolId?: string | null;
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
  activeToolId,
}: EditorElementProps<ElementType>) {
  const targetRef = useRef<HTMLDivElement>(null);
  const ElementComponent =
    (ELEMENT_COMPONENTS[element.type] as React.ComponentType<EditorElementProps<ElementType>>) ??
    UnknownElement;
  const messages = useMessageService();

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key !== 'Backspace') {
        return;
      }

      if (!selected) {
        return;
      }

      messages.send({
        type: 'deleteElement',
        id: element.id,
      });
    };

    window.addEventListener('keydown', listener);

    return () => window.removeEventListener('keydown', listener);
  }, [selected]);

  return (
    <>
      <div
        onClick={() => onSelect?.(element.id)}
        className={`
          box-border font-bold
          ${activeToolId === EditorToolId.POINTER ? 'cursor-pointer' : ''}
          ${
            activeToolId === EditorToolId.POINTER && !selected
              ? 'hover:outline hover:outline-1 hover:outline-focus-border'
              : ''
          }
          ${selected ? 'outline outline-2 outline-focus-border bg-focus-border/12' : ''}
        `}
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
      {activeToolId === EditorToolId.POINTER && (
        <ElementInteractionController element={element} selected={selected} targetRef={targetRef} />
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
  [EditorElementType.Code]: CodeElement,
  [EditorElementType.Image]: ImageElement,
  [EditorElementType.Shape]: ShapeElement,
  [EditorElementType.Arrow]: ArrowElement,
} as const satisfies {
  [ElementType in EditorElementType]: React.ComponentType<EditorElementProps<ElementType>>;
};

function UnknownElement({ element }: { element: unknown }) {
  return (
    <div>
      Unknown Element Type:
      <code>{JSON.stringify(element)}</code>
    </div>
  );
}
