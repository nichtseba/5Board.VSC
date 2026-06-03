import type React from 'react';
import { EditorElement, EditorElementType } from '5board.vsc-common';
import { TextElement } from './elements/TextElement';
import { HeadingElement } from './elements/HeadingElement';
import { CodeElement } from './elements/CodeElement';
import { ImageElement } from './elements/ImageElement';
import { ShapeElement } from './elements/ShapeElement';
import { ArrowElement } from './elements/ArrowElement';

export type EditorElementProps<T extends EditorElementType> = {
  element: EditorElement<T>;
  onSelect?: (id: string) => void;
  selected?: boolean;
};

/**
 * Renders an editor element based on its type. The actual rendering logic for each element type is delegated to specific components (e.g., HeadingElement for heading elements).
 * Uses {@link ELEMENT_COMPONENTS} to determine which component to render for each element type.
 */
export default function EditorElement<ElementType extends EditorElementType>({
  element,
  onSelect,
  selected,
}: EditorElementProps<ElementType>) {
  const ElementComponent =
    (ELEMENT_COMPONENTS[element.type] as React.ComponentType<EditorElementProps<ElementType>>) ??
    UnknownElement;

  return (
    <div
      onClick={() => onSelect?.(element.id)}
      className={`editor-element editor-element-hover ${selected ? 'editor-element-selected' : ''} pl-[var(--editor-spacing)] font-bold`}
      style={{
        gridRowStart: element.layout.yPos + 1,
        gridRowEnd: `span ${element.layout.height}`,
        gridColumnStart: element.layout.xPos + 1,
        gridColumnEnd: `span ${element.layout.width}`,
      }}
    >
      <ElementComponent element={element} selected={selected} onSelect={onSelect} />
    </div>
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
