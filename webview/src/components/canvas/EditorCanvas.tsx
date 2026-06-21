import { EditorToolId } from '5board.vsc-common';
import { useEffect, useRef } from 'react';
import EditorElement from './EditorElement';
import { useMessageService } from '../../services/MessageService';
import './EditorCanvas.css';
import { useBoardDocument } from '../../providers/BoardDocumentProvider';
import { useEditorState } from '../../providers/EditorStateProvider';
import { useCanvasEventDispatcher } from '../../providers/CanvasEventsProvider';
import SpacerTool from './tools/SpacerTool';

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

  useEffect(() => {
    if (activeToolId !== EditorToolId.POINTER && document?.content.selectedElementId) {
      messages.send({
        type: 'selectElement',
        id: null,
      });
    }
  }, [activeToolId, document?.content.selectedElementId, messages]);

  const handleSelectElement = (id: string) => {
    if (activeToolId !== EditorToolId.POINTER) return;

    messages.send({
      type: 'selectElement',
      id,
    });
  };

  return (
    <>
      {`Selected element ID: ${selectedElementId}`}
      <div
        ref={canvasRef}
        className={`editor-canvas bg-editor-background ${activeToolId === EditorToolId.SPACER ? 'cursor-row-resize' : ''}`}
        onPointerDown={(e) => emit('pointerDown', e.nativeEvent)}
        onPointerMove={(e) => emit('pointerMove', e.nativeEvent)}
        onPointerUp={(e) => emit('pointerUp', e.nativeEvent)}
        onPointerCancel={(e) => emit('pointerCancel', e.nativeEvent)}
      >
        <SpacerTool canvasRef={canvasRef} />
        {document?.content.elements.map((element) => (
          <EditorElement
            key={element.id}
            element={element}
            selected={element.id === selectedElementId}
            onSelect={handleSelectElement}
            activeToolId={activeToolId}
          />
        ))}
      </div>
    </>
  );
}
