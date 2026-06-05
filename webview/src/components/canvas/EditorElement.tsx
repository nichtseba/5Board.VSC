import { useRef } from 'react';
import { EditorElement, EditorElementType, EditorToolId } from '5board.vsc-common';
import type React from 'react';
import { TextElement } from './elements/TextElement';
import { HeadingElement } from './elements/HeadingElement';
import ElementInteractionController from './elementInteraction/ElementInteractionController';

export type EditorElementProps<T extends EditorElementType> = {
  element: EditorElement<T>;
  onSelect?: (id: string) => void;
  selected?: boolean;
  targetRef?: React.RefObject<HTMLDivElement>;
  onUpdateLayout?: (id: string, changes: Partial<EditorElement<T>['layout']>) => void;
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
  onUpdateLayout,
  activeToolId,
}: EditorElementProps<ElementType>) {
  const targetRef = useRef<HTMLDivElement>(null);
  const ElementComponent = ELEMENT_COMPONENTS[element.type] as React.ComponentType<
    EditorElementProps<ElementType>
  >;

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
      {activeToolId === EditorToolId.POINTER && (
        <ElementInteractionController
          element={element}
          selected={selected}
          targetRef={targetRef}
          onUpdateLayout={onUpdateLayout}
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
