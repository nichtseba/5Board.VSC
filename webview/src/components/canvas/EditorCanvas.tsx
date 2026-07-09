import { EditorToolId, computeHeadingNumbers } from '5board.vsc-common';
import { useMemo, useEffect, useRef } from 'react';
import { useEffect, useRef } from 'react';
import { EditorToolId, ProjectorPointerStyle } from '5board.vsc-common';
import EditorElement from './EditorElement';
import { HeadingNumberingProvider } from './HeadingNumberingContext';
import ProjectorMouse, { ProjectorCursor } from '../projector/ProjectorMouse';
import './EditorCanvas.css';
import { useEditorState } from '../../providers/EditorStateProvider';
import { useMessageService } from '../../services/MessageService';
import { useGrid } from '../../providers/GridProvider';
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

  const elements = document?.content.elements;
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
    if (activeToolId !== EditorToolId.POINTER && document?.content.selectedElementId) {
      messages.send({
        type: 'selectElement',
        id: null,
      });
    }
  }, [activeToolId, document?.content.selectedElementId, messages]);

  const headingNumbers = useMemo(
    () => computeHeadingNumbers(elements ?? [], document?.content.headingSettings),
    [elements, document?.content.headingSettings],
  );

  return (
    <>
      {`Selected element ID: ${selectedElementId}`}
      <HeadingNumberingProvider value={headingNumbers}>
        <div
          ref={canvasRef}
          className={`editor-canvas bg-editor-background ${activeToolId === EditorToolId.SPACER ? 'cursor-row-resize' : ''}`}
          onPointerDown={(e) => emit('pointerDown', e.nativeEvent)} // Todo: do not hand over dom elements directly
          onPointerMove={(e) => emit('pointerMove', e.nativeEvent)}
          onPointerUp={(e) => emit('pointerUp', e.nativeEvent)}
          onPointerCancel={(e) => emit('pointerCancel', e.nativeEvent)}
        >
          <CanvasTools />
          {elements?.map((element) => (
            <EditorElement
              key={element.id}
              element={element}
              selected={element.id === selectedElementId}
            />
          ))}
        </div>
      </HeadingNumberingProvider>
      {/*
        position: relative is required so the absolute cursor overlay stays
        clipped inside the canvas boundaries and does not bleed outside.
      */}
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
            selected={element.id === selectedElementId}
          />
        ))}

        {/* Cursor overlay — only rendered in the projector via the cursor prop */}
        <ProjectorMouse cursor={cursor ?? null} style={pointerStyle} />
      </div>
    </>
  );
}
