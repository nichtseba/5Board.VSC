import { EditorToolId, ProjectorPointerStyle, computeHeadingNumbers } from '5board.vsc-common';
import { useEffect, useMemo, useRef } from 'react';
import EditorElement from './EditorElement';
import { HeadingNumberingProvider } from './HeadingNumberingContext';
import ProjectorMouse, { ProjectorCursor } from '../projector/ProjectorMouse';
import './EditorCanvas.css';
import { useEditorState } from '../../providers/EditorStateProvider';
import { useMessageService } from '../../services/MessageService';
import { useGrid } from '../../providers/GridProvider';
import { CanvasTools } from './tools/CanvasTools';
import FreehandPreviewOverlay, { FreehandPreview } from './tools/FreehandPreviewOverlay';
import { useBoardDocument } from '../../providers/BoardDocumentProvider';
import { useCanvasPointer } from './useCanvasPointer';

export type EditorCanvasProps = {
  // Normalized (0–1) cursor position to display as a live overlay.
  // Only the projector passes this to mirror the editor's pointer position.
  cursor?: ProjectorCursor | null;
  pointerStyle?: ProjectorPointerStyle;
  // Live freehand stroke to mirror (projector only). The editor draws its own
  // preview locally via the FreehandTool.
  freehandPreview?: FreehandPreview | null;
};

export default function EditorCanvas({ cursor, pointerStyle, freehandPreview }: EditorCanvasProps) {
  // All pointer handling lives in one hook.
  const pointerHandlers = useCanvasPointer();

  const document = useBoardDocument();
  const editorState = useEditorState();

  const elements = document?.content.elements;
  const selectedElementIds = document?.content.selectedElementIds ?? [];
  const activeToolId = editorState?.tool.type;

  const messages = useMessageService();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const { setGridElement } = useGrid();

  useEffect(() => {
    setGridElement(canvasRef.current);
    return () => {
      setGridElement(null);
    };
  }, [setGridElement]);

  useEffect(() => {
    if (
      activeToolId !== EditorToolId.POINTER &&
      (document?.content.selectedElementIds.length ?? 0) > 0
    ) {
      messages.send({
        type: 'selectElement',
        id: null,
      });
    }
  }, [activeToolId, document?.content.selectedElementIds, messages]);

  const headingNumbers = useMemo(
    () => computeHeadingNumbers(elements ?? [], document?.content.headingSettings),
    [elements, document?.content.headingSettings],
  );

  return (
    <HeadingNumberingProvider value={headingNumbers}>
      <div
        ref={canvasRef}
        className={`editor-canvas bg-editor-background ${activeToolId === EditorToolId.SPACER ? 'cursor-row-resize' : ''}`}
        style={{ position: 'relative' }}
        {...pointerHandlers}
      >
        <CanvasTools />

        {document?.content.elements.map((element) => (
          <EditorElement
            key={element.id}
            element={element}
            selected={selectedElementIds.includes(element.id)}
          />
        ))}

        {/* Cursor overlay — only rendered in the projector via the cursor prop */}
        <ProjectorMouse cursor={cursor ?? null} style={pointerStyle} />

        {/* Live freehand stroke mirrored from the editor — projector only */}
        <FreehandPreviewOverlay preview={freehandPreview ?? null} />
      </div>
    </HeadingNumberingProvider>
  );
}
