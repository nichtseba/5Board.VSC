import { useEffect, useRef, useState } from 'react';
import {
  EditorElement,
  EditorElementType,
  EditorToolId,
  findTopLevelBoardElement,
  flattenBoardElements,
} from '5board.vsc-common';
import type React from 'react';
import {
  ArrowTopRightOnSquareIcon,
  ChatBubbleBottomCenterTextIcon,
} from '@heroicons/react/24/outline';
import { TextElement } from './elements/TextElement';
import { HeadingElement } from './elements/HeadingElement';
import ElementInteractionController from './elementInteraction/ElementInteractionController';
import ElementContextMenu from './elementInteraction/ElementContextMenu';
import { CodeElement } from './elements/code/CodeElement';
import { ImageElement } from './elements/ImageElement';
import { LineElement } from './elements/LineElement';
import { FreehandElement } from './elements/FreehandElement';
import { TableOfContentsElement } from './elements/TableOfContentsElement';
import { useEditorState } from '../../providers/EditorStateProvider';
import { useMessageService } from '../../services/MessageService';
import { useViewType } from '../../providers/ViewTypeProvider';
import { useBoardDocument } from '../../providers/BoardDocumentProvider';
import { useLocalization } from '../../providers/LocalizationProvider';
import { RectangleElement } from './elements/RectangleElement';
import { CircleElement } from './elements/CircleElement';
import { maxZIndex, minZIndex } from './logic/zIndex';
import {
  ELEMENT_INTERACTION_CONFIG,
  type ElementInteractionProfile,
} from './elementInteraction/InteractionConfig';

export type EditorElementProps<T extends EditorElementType> = {
  element: EditorElement<T>;
  selected?: boolean;
  onSelect?: (event?: React.MouseEvent) => void;
  grouped?: boolean;
  editing?: boolean;
  editingPosition?: {
    x: number;
    y: number;
  } | null;
  onStopEditing?: () => void;
  targetRef?: React.RefObject<HTMLDivElement>;
  assetUrls?: Record<string, string>;
  preview?: boolean;
  /** Smallest resizable height in px. Only code blocks report one. */
  onMinHeightChange?: (minHeight: number) => void;
  exportMode?: boolean;
  /**
   * Presentation state shown in the editor while a projector is open:
   * 'hidden' = not shown on the projector, 'next' = shown by the next reveal step.
   */
  revealMarker?: 'hidden' | 'next';
  /** Whether a projector is open, which enables presentation actions in the context menu. */
  presenting?: boolean;
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
  grouped,
  assetUrls,
  preview,
  exportMode,
  revealMarker,
  presenting,
}: EditorElementProps<ElementType>) {
  const targetRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [editingPosition, setEditingPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [minHeight, setMinHeight] = useState<number>();
  const ElementComponent =
    (ELEMENT_COMPONENTS[element.type] as React.ComponentType<EditorElementProps<ElementType>>) ??
    UnknownElement;
  const messages = useMessageService();
  const { t } = useLocalization();
  const activeToolId = useEditorState()?.tool.type;
  const boardElements = useBoardDocument()?.content.elements ?? [];
  const allElements = flattenBoardElements(boardElements);
  const profile: ElementInteractionProfile = ELEMENT_INTERACTION_CONFIG[element.type];
  const viewType = useViewType();
  const canEdit = viewType === 'editor' && !preview && activeToolId === EditorToolId.POINTER;

  const handleSelectElement = (id: string, event?: React.MouseEvent) => {
    if (activeToolId !== EditorToolId.POINTER) return;

    const selectedElement = findTopLevelBoardElement(boardElements, id);
    const selectedId = selectedElement?.id ?? id;

    if (event?.shiftKey) {
      messages.send({ type: 'toggleElementSelection', ids: [selectedId] });
      return;
    }

    messages.send({ type: 'selectElements', ids: [selectedId] });
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    if (activeToolId !== EditorToolId.POINTER) return;
    event.preventDefault();
    if (!selected) handleSelectElement(element.id);
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
  };

  const setZIndex = (zIndex: number) => {
    messages.send({
      type: 'updateElements',
      changes: [
        {
          id: element.id,
          changes: { layout: { ...element.layout, zIndex } },
        },
      ],
    });
    setContextMenuPosition(null);
  };

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key !== 'Delete') {
        return;
      }

      const target = event.target;
      if (
        !selected ||
        editing ||
        !canEdit ||
        (target instanceof HTMLElement &&
          (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)))
      ) {
        return;
      }

      messages.send({
        type: 'deleteElements',
        ids: [element.id],
      });
    };

    window.addEventListener('keydown', listener);

    return () => window.removeEventListener('keydown', listener);
  });

  const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (
      !canEdit ||
      editing ||
      (element.type !== EditorElementType.Text &&
        element.type !== EditorElementType.Heading &&
        element.type !== EditorElementType.Code)
    ) {
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
    if (!selected || !canEdit) {
      setEditing(false);
      setEditingPosition(null);
    }
  }, [selected, canEdit]);
  const gridPlacement = {
    gridRowStart: element.layout.yPos + 1,
    gridRowEnd: `span ${element.layout.height}`,
    gridColumnStart: element.layout.xPos + 1,
    gridColumnEnd: `span ${element.layout.width}`,
  };
  // Badges that mark elements which are never projected or left out of the export.
  const displayBadges =
    viewType === 'editor' && !preview && !exportMode
      ? [
          ...(element.display.speakerNote
            ? [
                {
                  key: 'speakerNote',
                  Icon: ChatBubbleBottomCenterTextIcon,
                  label: t('webview.canvas.speakerNote'),
                  hint: t('webview.canvas.speakerNoteHint'),
                  color: SPEAKER_NOTE_COLOR,
                },
              ]
            : []),
          ...(element.display.excludeFromExport
            ? [
                {
                  key: 'excludeFromExport',
                  Icon: ArrowTopRightOnSquareIcon,
                  label: t('webview.canvas.excludedFromExport'),
                  hint: t('webview.canvas.excludedFromExportHint'),
                  color: EXCLUDED_FROM_EXPORT_COLOR,
                },
              ]
            : []),
        ]
      : [];
  const hidden =
    preview ||
    (viewType === 'projector' && (element.display.speakerNote || !element.display.visible)) ||
    (viewType === 'export' && (element.display.speakerNote || element.display.excludeFromExport));

  return (
    <>
      <div
        id={element.id}
        data-editor-element
        onClick={(event) => handleSelectElement(element.id, event)}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        className={`
          box-border 
          ${profile.clickThroughEmptyArea ? 'pointer-events-none' : ''}
          ${element.type === EditorElementType.Line ? '' : 'overflow-hidden'}
          ${activeToolId === EditorToolId.POINTER ? 'cursor-pointer' : ''}
          ${
            activeToolId === EditorToolId.POINTER && !selected
              ? 'hover:outline hover:outline-1 hover:outline-focus-border'
              : ''
          }
          ${selected ? 'outline outline-2 outline-focus-border bg-focus-border/12' : ''}
          ${hidden ? 'invisible' : ''}
          transition-opacity
        `}
        ref={targetRef}
        style={{
          ...gridPlacement,
          transform: `rotate(${element.layout.rotation ?? 0}deg)`,
          transformOrigin: 'center center',
          zIndex: element.layout.zIndex,
          opacity: revealMarker ? HIDDEN_REVEAL_OPACITY : undefined,
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
          exportMode={exportMode}
          onStopEditing={handleStopEditing}
          onMinHeightChange={setMinHeight}
        />
      </div>
      {(revealMarker === 'next' || displayBadges.length > 0) && (
        // Separate grid item so the markers are neither clipped nor dimmed with the element.
        <div
          aria-hidden
          className="pointer-events-none relative rounded-sm"
          style={{
            ...gridPlacement,
            zIndex: ELEMENT_MARKER_Z_INDEX,
            outline:
              revealMarker === 'next'
                ? `2px dashed ${NEXT_REVEAL_COLOR}`
                : element.display.speakerNote
                  ? `1px dashed ${SPEAKER_NOTE_COLOR}`
                  : undefined,
            outlineOffset: 2,
          }}
        >
          {revealMarker === 'next' && (
            <span
              className="absolute left-0 -top-5 whitespace-nowrap rounded-sm px-1 text-xs leading-4"
              style={{
                backgroundColor: NEXT_REVEAL_COLOR,
                color: 'var(--vscode-editor-background)',
              }}
            >
              ▶ {t('webview.canvas.nextReveal')}
            </span>
          )}
          {displayBadges.length > 0 && (
            <div className="absolute right-0 -top-5 flex gap-1">
              {displayBadges.map(({ key, Icon, label, hint, color }) => (
                <span
                  key={key}
                  title={`${label}: ${hint}`}
                  className="pointer-events-auto flex h-4 items-center gap-0.5 whitespace-nowrap rounded-sm px-1 text-xs leading-4"
                  style={{ backgroundColor: color, color: 'var(--vscode-editor-background)' }}
                >
                  <Icon className="size-3" />
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {activeToolId === EditorToolId.POINTER && !grouped && (
        <ElementInteractionController
          element={element}
          selected={selected && !editing}
          targetRef={targetRef}
          minHeight={minHeight}
        />
      )}
      {contextMenuPosition && (
        <ElementContextMenu
          position={contextMenuPosition}
          onClose={() => setContextMenuPosition(null)}
          items={[
            {
              label: t('webview.canvas.contextMenu.bringToFront'),
              icon: 'arrow-up',
              onClick: () => setZIndex(maxZIndex(allElements) + 1),
            },
            {
              label: t('webview.canvas.contextMenu.sendToBack'),
              icon: 'arrow-down',
              onClick: () => setZIndex(minZIndex(allElements) - 1),
            },
            ...(presenting && !element.display.speakerNote
              ? [
                  {
                    label: t('webview.canvas.contextMenu.revealUpTo'),
                    icon: 'eye',
                    onClick: () => {
                      messages.send({ type: 'revealUpTo', elementId: element.id });
                      setContextMenuPosition(null);
                    },
                  },
                ]
              : []),
          ]}
        />
      )}
    </>
  );
}

const HIDDEN_REVEAL_OPACITY = 0.35;
const NEXT_REVEAL_COLOR = 'var(--vscode-charts-orange, #d18616)';
const SPEAKER_NOTE_COLOR = 'var(--vscode-charts-blue, #3794ff)';
const EXCLUDED_FROM_EXPORT_COLOR = 'var(--vscode-charts-purple, #b180d7)';
const ELEMENT_MARKER_Z_INDEX = 1000;

/*
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
  [EditorElementType.TableOfContents]: TableOfContentsElement,
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
