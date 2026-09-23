import { useEffect, useMemo, useRef, useState } from 'react';
import { EditorToolId, ProjectorPointerStyle, computeHeadingNumbers } from '5board.vsc-common';
import EditorElement from './EditorElement';
import { HeadingNumberingProvider } from '../../providers/HeadingNumberingContext';
import ProjectorMouse, { ProjectorCursor } from '../projector/ProjectorMouse';
import './EditorCanvas.css';
import { useEditorState } from '../../providers/EditorStateProvider';
import { useMessageService } from '../../services/MessageService';
import { useGrid } from '../../providers/GridProvider';
import { createAssetUrls, revokeAssetUrls } from './logic/assetUrlsUtil';
import { useImageImport } from './logic/useImageImport';
import { CanvasTools } from './tools/CanvasTools';
import FreehandPreviewOverlay, { FreehandPreview } from './tools/FreehandPreviewOverlay';
import { useBoardDocument } from '../../providers/BoardDocumentProvider';
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
};

export default function EditorCanvas({
  enableKeyboardShortcuts = false,
  cursor,
  pointerStyle,
  freehandPreview,
}: EditorCanvasProps) {
  // All pointer handling lives in one hook.
  const pointerHandlers = useCanvasPointer();

  const document = useBoardDocument();
  const editorState = useEditorState();

  const elements = document?.content.elements ?? [];
  const selectedElementIds = document?.content.selectedElementIds ?? [];
  const activeToolId = editorState?.tool.type;

  const messages = useMessageService();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const imageImportHandlers = useImageImport();
  const { setGridElement } = useGrid();

  useEffect(() => {
    setGridElement(canvasRef.current);
    return () => {
      setGridElement(null);
    };
  }, [setGridElement]);

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
        messages.send({ type: 'copyElements' });
      } else if (modifierPressed && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        messages.send({ type: 'pasteElements' });
      } else if (
        event.altKey &&
        event.shiftKey &&
        (event.key === 'ArrowDown' || event.key === 'ArrowUp')
      ) {
        event.preventDefault();
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
    const urls = createAssetUrls(document.assets);
    setAssetUrls(urls);

    return () => {
      revokeAssetUrls(urls);
    };
  }, [document]);
  const headingNumbers = useMemo(
    () => computeHeadingNumbers(elements ?? [], document?.content.headingSettings),
    [elements, document?.content.headingSettings],
  );

  const { marqueeRect } = useMarqueeSelection({
    activeToolId,
    elements,
    messages,
  });

  return (
    <HeadingNumberingProvider value={headingNumbers}>
      <div
        ref={canvasRef}
        className={`
          editor-canvas
           bg-editor-background 
           select-none
           ${activeToolId === EditorToolId.SPACER ? 'cursor-row-resize' : ''} 
           `}
        style={{ position: 'relative' }}
        {...pointerHandlers}
        {...imageImportHandlers}
      >
        <CanvasTools />

        {document?.content.elements.map((element) => (
          <EditorElement
            key={element.id}
            element={element}
            selected={selectedElementIds.includes(element.id)}
            assetUrls={assetUrls}
          />
        ))}

        {/* Cursor overlay — only rendered in the projector via the cursor prop */}
        <ProjectorMouse cursor={cursor ?? null} style={pointerStyle} />

        {/* Live freehand stroke mirrored from the editor — projector only */}
        <FreehandPreviewOverlay preview={freehandPreview ?? null} />
        <MarqueeOverlay rect={marqueeRect} />
      </div>
    </HeadingNumberingProvider>
  );
}
