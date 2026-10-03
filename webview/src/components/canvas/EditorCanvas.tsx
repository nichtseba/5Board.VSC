import {
  DEFAULT_GRID_SETTINGS,
  EditorToolId,
  ProjectorPointerStyle,
  computeHeadingNumbers,
  findBoardElementById,
  flattenBoardElements,
  getLeafElementIds,
} from '5board.vsc-common';
import { useEffect, useMemo, useRef, type CSSProperties, useState } from 'react';
import EditorElement from './EditorElement';
import { HeadingNumberingProvider } from '../../providers/HeadingNumberingContext';
import ProjectorMouse, { ProjectorCursor } from '../projector/ProjectorMouse';
import './EditorCanvas.css';
import { useEditorState } from '../../providers/EditorStateProvider';
import { useMessageService, useOnMessage } from '../../services/MessageService';
import { useGrid } from '../../providers/GridProvider';
import { createAssetUrls } from './logic/assetUrlsUtil';
import { useImageImport } from './logic/useImageImport';
import { CanvasTools } from './tools/CanvasTools';
import FreehandPreviewOverlay, { FreehandPreview } from './tools/FreehandPreviewOverlay';
import { useBoardDocument } from '../../providers/BoardDocumentProvider';
import GroupInteractionController from './elementInteraction/GroupInteractionController';
import { useCanvasPointer } from './logic/useCanvasPointer';
import { useMarqueeSelection } from './logic/useMarqueeSelection';
import { MarqueeOverlay } from './logic/MarqueeOverlay';

export type EditorCanvasProps = {
  enableKeyboardShortcuts?: boolean;
  // Normalized (0–1) cursor position to display as a live overlay.
  // Only the projector passes this to mirror the editor's pointer position.
  cursor?: ProjectorCursor | null;
  pointerStyle?: ProjectorPointerStyle;
  // Live freehand stroke to mirror (projector only). The editor draws its own
  // preview locally via the FreehandTool.
  freehandPreview?: FreehandPreview | null;
  readOnly?: boolean;
};

export default function EditorCanvas({
  readOnly = false,
  enableKeyboardShortcuts = false,
  cursor,
  pointerStyle,
  freehandPreview,
}: EditorCanvasProps) {
  // All pointer handling lives in one hook.
  const pointerHandlers = useCanvasPointer();

  const document = useBoardDocument();
  const grid = document?.content.grid ?? DEFAULT_GRID_SETTINGS;
  const editorState = useEditorState();

  const elements = document?.content.elements ?? [];
  const flatElements = useMemo(() => flattenBoardElements(elements), [elements]);
  const selectedElementIds = document?.content.selectedElementIds ?? [];
  const selectedLeafIds = selectedElementIds.flatMap((id) => {
    const selected = findBoardElementById(elements, id);
    return selected ? getLeafElementIds([selected]) : [];
  });
  const activeToolId = editorState?.tool.type;

  const messages = useMessageService();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [elementToScrollId, setElementToScrollId] = useState<string | null>(null);
  const imageImportHandlers = useImageImport();
  const { setGridElement } = useGrid();

  useEffect(() => {
    setGridElement(canvasRef.current);
    return () => {
      setGridElement(null);
    };
  }, [setGridElement]);

  useOnMessage((msg) => {
    if (msg.type === 'goToElement') {
      setElementToScrollId(msg.elementId);
    }
  });

  useEffect(() => {
    if (!elementToScrollId || !elements.some((element) => element.id === elementToScrollId)) {
      return;
    }

    const target = globalThis.document.getElementById(elementToScrollId);
    if (!target) {
      return;
    }

    target.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    });
    setElementToScrollId(null);
  }, [elementToScrollId, elements]);

  useEffect(() => {
    if (!enableKeyboardShortcuts) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;

      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName))
      ) {
        return;
      }

      const modifierPressed = event.metaKey || event.ctrlKey;

      if (modifierPressed && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        event.stopImmediatePropagation();
        messages.send({ type: 'copyElements' });
      } else if (modifierPressed && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        event.stopImmediatePropagation();
        messages.send({ type: 'pasteElements' });
      } else if (modifierPressed && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        event.stopImmediatePropagation();
        messages.send({ type: 'duplicateElements' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, messages]);

  useEffect(() => {
    if (
      activeToolId !== EditorToolId.POINTER &&
      (document?.content?.selectedElementIds?.length ?? 0) > 0
    ) {
      messages.send({
        type: 'selectElements',
        ids: [],
      });
    }
  }, [activeToolId, document?.content.selectedElementIds, messages]);

  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!document) {
      setAssetUrls({});
      return;
    }
    setAssetUrls(createAssetUrls(document.assets));
  }, [document]);
  const headingNumbers = useMemo(
    () => computeHeadingNumbers(flatElements, document?.content.headingSettings),
    [elements, document?.content.headingSettings],
  );

  const { marqueeRect } = useMarqueeSelection({
    activeToolId,
    elements: flatElements,
    boardElements: elements,
    messages,
  });

  return (
    <HeadingNumberingProvider value={headingNumbers}>
      <div
        ref={canvasRef}
        id="html-export-canvas"
        className={`
          editor-canvas
           bg-editor-background 
           select-none
           ${activeToolId === EditorToolId.SPACER ? 'cursor-row-resize' : ''} 
           `}
        style={
          {
            position: 'relative',
            '--spacing-editor': `${grid.cellSize}px`,
            '--editor-columns': String(grid.columnCount),
          } as CSSProperties
        }
        {...pointerHandlers}
        {...imageImportHandlers}
      >
        {!readOnly && <CanvasTools />}

        {flatElements.map((element) => (
          <EditorElement
            key={element.id}
            element={element}
            selected={!readOnly && selectedLeafIds.includes(element.id)}
            grouped={selectedLeafIds.length > 1}
            assetUrls={assetUrls}
          />
        ))}

        {activeToolId === EditorToolId.POINTER && selectedLeafIds.length > 1 && (
          <GroupInteractionController
            elements={flatElements}
            selectedElementIds={selectedLeafIds}
          />
        )}

        {/* Cursor overlay — only rendered in the projector via the cursor prop */}
        <ProjectorMouse cursor={cursor ?? null} style={pointerStyle} />

        {/* Live freehand stroke mirrored from the editor — projector only */}
        <FreehandPreviewOverlay preview={freehandPreview ?? null} />
        <MarqueeOverlay rect={marqueeRect} />
      </div>
    </HeadingNumberingProvider>
  );
}
