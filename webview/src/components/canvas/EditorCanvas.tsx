import { BoardDocument, EditorState, EditorToolId } from '5board.vsc-common';
import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import EditorElement from './EditorElement';
import SpacerOverlay from './SpacerOverlay';
import { useMessageService, useOnMessage } from '../../services/MessageService';
import './EditorCanvas.css';
import { useGrid } from '../../providers/GridProvider';
import { createAssetUrls, revokeAssetUrls } from './assetUrlsUtil';
import { useImageImport } from './useImageImport';

export type EditorCanvasProps = {
  document: BoardDocument;
};

/**
 * Renders the editor canvas, which displays all editor elements based on their yPos.
 */
export default function EditorCanvas({ document }: EditorCanvasProps) {
  const [editorState, setEditorState] = useState<EditorState>({
    tool: {
      type: EditorToolId.POINTER,
      parameters: undefined,
    },
  });
  const selectedElementId = document.content.selectedElementId ?? null;
  const activeToolId = editorState.tool.type;

  const messages = useMessageService();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const imageImportHandlers = useImageImport();

  const { cellSize, setGridElement } = useGrid();
  useEffect(() => {
    setGridElement(canvasRef.current);
  }, [setGridElement]);
  const rowHeight = cellSize.height;

  const [dragState, setDragState] = useState<{
    startY: number;
    currentY: number;
    startRow: number;
    draggedRows: number;
  } | null>(null);

  useEffect(() => {
    messages.send({ type: 'ready' });
  }, []);

  useOnMessage((msg) => {
    if (msg.type === 'updateEditorState' || msg.type === 'init') {
      setEditorState(msg.editorState);
    }
  });

  useEffect(() => {
    if (activeToolId !== EditorToolId.POINTER && document.content.selectedElementId) {
      messages.send({
        type: 'selectElement',
        id: null,
      });
    }
  }, [activeToolId, document.content.selectedElementId, messages]);

  const handleSelectElement = (id: string) => {
    if (activeToolId !== EditorToolId.POINTER) return;

    messages.send({
      type: 'selectElement',
      id,
    });
  };

  useEffect(() => {
    if (!(activeToolId === EditorToolId.SPACER)) {
      setDragState(null);
      return;
    }

    const handlePointerRelease = () => {
      setDragState((prev) => {
        if (!prev || prev.draggedRows === 0) {
          return null;
        }

        messages.send({
          type: 'insertSpacerRows',
          startRow: prev.startRow,
          rowCount: prev.draggedRows,
        });

        return null;
      });
    };

    window.addEventListener('pointerup', handlePointerRelease);
    window.addEventListener('pointercancel', handlePointerRelease);

    return () => {
      window.removeEventListener('pointerup', handlePointerRelease);
      window.removeEventListener('pointercancel', handlePointerRelease);
    };
  }, [activeToolId]);

  const getRowFromClientY = (clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;

    const y = clientY - canvas.getBoundingClientRect().top;

    return Math.max(0, Math.floor(y / rowHeight));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!(activeToolId === EditorToolId.SPACER) || event.button !== 0) return;

    event.preventDefault();
    setDragState({
      startY: event.clientY,
      currentY: event.clientY,
      startRow: getRowFromClientY(event.clientY),
      draggedRows: 0,
    });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!(activeToolId === EditorToolId.SPACER) || !dragState) return;

    const draggedRows = Math.round((event.clientY - dragState.startY) / rowHeight);

    setDragState((prev) =>
      prev
        ? {
            ...prev,
            currentY: event.clientY,
            draggedRows,
          }
        : prev,
    );
  };

  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    const urls = createAssetUrls(document.assets);
    setAssetUrls(urls);

    return () => {
      revokeAssetUrls(urls);
    };
  }, [document.assets]);

  return (
    <>
      {`Selected element ID: ${selectedElementId}`}
      <div
        ref={canvasRef}
        className={`editor-canvas bg-editor-background ${activeToolId === EditorToolId.SPACER ? 'cursor-row-resize' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        {...imageImportHandlers}
      >
        {activeToolId === EditorToolId.SPACER ? (
          <SpacerOverlay dragState={dragState} canvasRef={canvasRef} />
        ) : null}
        {document.content.elements.map((element) => (
          <EditorElement
            key={element.id}
            element={element}
            selected={element.id === selectedElementId}
            onSelect={handleSelectElement}
            activeToolId={activeToolId}
            assetUrls={assetUrls}
          />
        ))}
      </div>
    </>
  );
}
