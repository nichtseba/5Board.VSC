import { useEffect, useRef, useState } from 'react';
import { EditorElement, EditorElementType, EditorToolId } from '5board.vsc-common';
import type React from 'react';
import { TextElement } from './elements/TextElement';
import { HeadingElement } from './elements/HeadingElement';
import ElementInteractionController from './elementInteraction/ElementInteractionController';
import { CodeElement } from './elements/CodeElement';
import { ImageElement } from './elements/ImageElement';
import { LineElement } from './elements/LineElement';
import { FreehandElement } from './elements/FreehandElement';
import { ContentTableElement } from './elements/ContentTableElement';
import { useEditorState } from '../../providers/EditorStateProvider';
import { useMessageService } from '../../services/MessageService';
import { RectangleElement } from './elements/RectangleElement';
import { CircleElement } from './elements/CircleElement';

export type EditorElementProps<T extends EditorElementType> = {
  element: EditorElement<T>;
  selected?: boolean;
  onSelect?: (event?: React.MouseEvent) => void;
  editing?: boolean;
  editingPosition?: {
    x: number;
    y: number;
  } | null;
  onStopEditing?: () => void;
  targetRef?: React.RefObject<HTMLDivElement>;
  assetUrls?: Record<string, string>;
  preview?: boolean;
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
  preview,
}: EditorElementProps<ElementType>) {
  const targetRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [editingPosition, setEditingPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const ElementComponent =
    (ELEMENT_COMPONENTS[element.type] as React.ComponentType<EditorElementProps<ElementType>>) ??
    UnknownElement;
  const messages = useMessageService();
  const activeToolId = useEditorState()?.tool.type;

  const handleSelectElement = (id: string, event?: React.MouseEvent) => {
    if (activeToolId !== EditorToolId.POINTER) return;

    if (event?.shiftKey) {
      messages.send({ type: 'toggleElementSelection', ids: [id] });
      return;
    }

    messages.send({ type: 'selectElements', ids: [id] });
  };

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key !== 'Delete') {
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
  });

  const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (element.type !== EditorElementType.Text) {
      return;
    }
    setEditingPosition({
      x: event.clientX,
      y: event.clientY,
    });
    setEditing(true);
  };

  const handleStopEditing = () => {
    setEditing(false);
    setEditingPosition(null);
  };

  useEffect(() => {
    if (!selected) {
      setEditing(false);
      setEditingPosition(null);
    }
  }, [selected]);

  return (
    <>
      <div
        id={element.id}
        data-editor-element
        onClick={(event) => handleSelectElement(element.id, event)}
        onDoubleClick={handleDoubleClick}
        className={`
          box-border 
          ${element.type === EditorElementType.Line ? '' : 'overflow-hidden'}
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
          transform: `rotate(${element.layout.rotation ?? 0}deg)`,
          transformOrigin: 'center center',
        }}
      >
        <ElementComponent
          element={element}
          targetRef={targetRef}
          selected={selected}
          onSelect={(event) => handleSelectElement(element.id, event)}
          editing={editing}
          editingPosition={editingPosition}
          assetUrls={assetUrls}
          preview={preview}
          onStopEditing={handleStopEditing}
        />
      </div>
      {activeToolId === EditorToolId.POINTER && (
        <ElementInteractionController
          element={element}
          selected={selected && !editing}
          targetRef={targetRef}
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
  [EditorElementType.Code]: CodeElement,
  [EditorElementType.Image]: ImageElement,
  [EditorElementType.Rectangle]: RectangleElement,
  [EditorElementType.Circle]: CircleElement,
  [EditorElementType.Line]: LineElement,
  [EditorElementType.Freehand]: FreehandElement,
  [EditorElementType.ContentTable]: ContentTableElement,
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
