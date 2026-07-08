import { useEffect, useRef, useState } from 'react';
import { EditorToolId, ProjectorPointerStyle } from '5board.vsc-common';
import EditorElement from './EditorElement';
import ProjectorMouse, { ProjectorCursor } from '../projector/ProjectorMouse';
import './EditorCanvas.css';
import { useEditorState } from '../../providers/EditorStateProvider';
import { useMessageService } from '../../services/MessageService';
import { useGrid } from '../../providers/GridProvider';
import { createAssetUrls, revokeAssetUrls } from './assetUrlsUtil';
import { useImageImport } from './useImageImport';
import { CanvasTools } from './tools/CanvasTools';
import { useBoardDocument } from '../../providers/BoardDocumentProvider';
import { useCanvasPointer } from './useCanvasPointer';

export type EditorCanvasProps = {
  // Normalized (0–1) cursor position to display as a live overlay.
  // Only the projector passes this to mirror the editor's pointer position.
  cursor?: ProjectorCursor | null;
  pointerStyle?: ProjectorPointerStyle;
};

export default function EditorCanvas({ cursor, pointerStyle }: EditorCanvasProps) {
  // All pointer handl lives in one hook
  const pointerHandlers = useCanvasPointer();

  const document = useBoardDocument();
  const editorState = useEditorState();

  const selectedElementId = document?.content.selectedElementId ?? null;
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
    if (activeToolId !== EditorToolId.POINTER && document?.content.selectedElementId) {
      messages.send({
        type: 'selectElement',
        id: null,
      });
    }
  }, [activeToolId, document?.content.selectedElementId, messages]);

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

  return (
    <>
      {/*
        position: relative is required so the absolute cursor overlay stays
        clipped inside the canvas boundaries and does not bleed outside.
      */}
      <div
        ref={canvasRef}
        className={`editor-canvas bg-editor-background ${activeToolId === EditorToolId.SPACER ? 'cursor-row-resize' : ''}`}
        style={{ position: 'relative' }}
        {...pointerHandlers}
        {...imageImportHandlers}
      >
        <CanvasTools />

        {document?.content.elements.map((element) => (
          <EditorElement
            key={element.id}
            element={element}
            selected={element.id === selectedElementId}
            assetUrls={assetUrls}
          />
        ))}

        {/* Cursor overlay — only rendered in the projector via the cursor prop */}
        <ProjectorMouse cursor={cursor ?? null} style={pointerStyle} />
      </div>
    </>
  );
}
