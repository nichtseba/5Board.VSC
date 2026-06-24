import { EditorToolId } from '5board.vsc-common';
import { useEffect, useRef } from 'react';
import EditorElement from './EditorElement';
import { useMessageService } from '../../services/MessageService';
import './EditorCanvas.css';
import { useBoardDocument } from '../../providers/BoardDocumentProvider';
import { useEditorState } from '../../providers/EditorStateProvider';
import { useCanvasEventDispatcher } from '../../providers/CanvasEventsProvider';
import { CanvasTools } from './tools/CanvasTools';
import { useGrid } from '../../providers/GridProvider';

/**
 * Renders the editor canvas, which displays all editor elements based on their yPos.
 */
export default function EditorCanvas() {
  const document = useBoardDocument();
  const editorState = useEditorState();
  const { emit } = useCanvasEventDispatcher();

  const selectedElementId = document?.content.selectedElementId ?? null;
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
    // Todo: move to correct component
    if (activeToolId !== EditorToolId.POINTER && document?.content.selectedElementId) {
      messages.send({
        type: 'selectElement',
        id: null,
      });
    }
  }, [activeToolId, document?.content.selectedElementId, messages]);

  return (
    <>
      {`Selected element ID: ${selectedElementId}`}
      <div
        ref={canvasRef}
        className={`editor-canvas bg-editor-background ${activeToolId === EditorToolId.SPACER ? 'cursor-row-resize' : ''}`}
        onPointerDown={(e) => emit('pointerDown', e.nativeEvent)} // Todo: do not hand over dom elements directly
        onPointerMove={(e) => emit('pointerMove', e.nativeEvent)}
        onPointerUp={(e) => emit('pointerUp', e.nativeEvent)}
        onPointerCancel={(e) => emit('pointerCancel', e.nativeEvent)}
      >
        <CanvasTools canvasRef={canvasRef} />
        {document?.content.elements.map((element) => (
          <EditorElement
            key={element.id}
            element={element}
            selected={element.id === selectedElementId}
          />
        ))}
      </div>
    </>
  );
}
