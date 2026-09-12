import { useRef } from 'react';
import { EditorElement, EditorElementType, EditorToolId } from '5board.vsc-common';
import type React from 'react';
import { TextElement } from './elements/TextElement';
import { HeadingElement } from './elements/HeadingElement';
import ElementInteractionController from './elementInteraction/ElementInteractionController';
import { CodeElement } from './elements/CodeElement';
import { ImageElement } from './elements/ImageElement';
import { ShapeElement } from './elements/ShapeElement';
import { ArrowElement } from './elements/ArrowElement';
import { FreehandElement } from './elements/FreehandElement';
import { useEditorState } from '../../providers/EditorStateProvider';
import { useMessageService } from '../../services/MessageService';

export type EditorElementProps<T extends EditorElementType> = {
  element: EditorElement<T>;
  selected?: boolean;
  onSelect?: () => void;
  targetRef?: React.RefObject<HTMLDivElement>;
  assetUrls?: Record<string, string>;
};

/**
 * Renders an editor element based on its type. The actual rendering logic for each element type is delegated to specific components (e.g., HeadingElement for heading elements).
 * Uses {@link ELEMENT_COMPONENTS} to determine which component to render for each element type.
 *
 * The moveable interaction behavior is centralized here so every editor element can be moved when selected.
 */
export default function EditorElement<ElementType extends EditorElementType>({
  element,
  selected,
  assetUrls,
}: EditorElementProps<ElementType>) {
  const targetRef = useRef<HTMLDivElement>(null);
  const ElementComponent =
    (ELEMENT_COMPONENTS[element.type] as React.ComponentType<EditorElementProps<ElementType>>) ??
    UnknownElement;
  const activeToolId = useEditorState()?.tool.type;
  const messages = useMessageService();

  const handleSelectElement = (id: string) => {
    if (activeToolId !== EditorToolId.POINTER) return;

    messages.send({
      type: 'selectElement',
      id,
    });
  };

  return (
    <>
      <div
        id={element.id}
        onClick={() => handleSelectElement(element.id)}
        className={`
          box-border
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
          assetUrls={assetUrls}
          onSelect={() => handleSelectElement(element.id)}
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
  [EditorElementType.Freehand]: FreehandElement,
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
