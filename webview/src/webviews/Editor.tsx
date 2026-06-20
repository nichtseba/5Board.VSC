import { useEffect, useState } from 'react';
import { useMessageService, useOnMessage } from '../services/MessageService';
import {
  BoardDocument,
  BoardElement,
  DEFAULT_FREEHAND_PARAMETERS,
  DEFAULT_TOOL_ID,
  EditorToolId,
  FreehandToolParameters,
} from '5board.vsc-common';
import { init } from '../app/init';
import EditorCanvas from '../components/canvas/EditorCanvas';

export default function Editor() {
  const messages = useMessageService();
  const [boardDocument, setBoardDocument] = useState<BoardDocument | null>(null);
  // Cursor tracking starts OFF (matches the extension's default) for performance.
  // The extension confirms the actual state via 'cursorTrackingChanged' on ready.
  const [cursorTrackingEnabled, setCursorTrackingEnabled] = useState(false);
  // The currently active tool, set by the sidebar via the extension ('toolChanged').
  const [activeTool, setActiveTool] = useState<EditorToolId>(DEFAULT_TOOL_ID);
  // Freehand color/width, also driven by the sidebar through 'toolChanged'.
  const [freehandParams, setFreehandParams] = useState<FreehandToolParameters>(
    DEFAULT_FREEHAND_PARAMETERS,
  );
  const [projectorViewport, setProjectorViewport] = useState<null | {
    top: number;
    left: number;
    width: number;
    height: number;
  }>(null);

  // Called by EditorCanvas with canvas-relative (0–1) coordinates.
  // Only fires when tracking is enabled (onCursorMove is only passed when enabled).
  const handleCursorMove = (x: number, y: number) => {
    console.log(`Mouse Position: (${x}, ${y})`); // dev tools
    messages.send({ type: 'cursorMove', x, y });
  };

  // Called when the mouse leaves the canvas; always sent regardless of tracking state
  // so the projector can clear the cursor dot even if tracking was just toggled on.
  const handleCursorLeave = () => {
    messages.send({ type: 'cursorLeave' });
  };

  // Called when the user clicks an element in the canvas.
  const handleElementSelect = (id: string | null) => {
    messages.send({ type: 'selectElement', elementId: id });
  };

  // Called by EditorCanvas when a freehand stroke is finished.
  // The extension appends the element and broadcasts the updated document.
  const handleAddElement = (element: BoardElement) => {
    messages.send({ type: 'addElement', element });
  };

  // Streams the in-progress freehand stroke to the projector (null = stroke ended).
  const handleFreehandPreview = (
    points: { x: number; y: number }[] | null,
    color: string,
    width: number,
  ) => {
    if (points) {
      messages.send({ type: 'freehandPreview', points, color, width });
    } else {
      messages.send({ type: 'freehandPreviewEnd' });
    }
  };

  useEffect(() => {
    messages.send({ type: 'ready' });
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const canvas = document.querySelector('.editor-canvas') as HTMLElement | null;
      const canvasRect = canvas?.getBoundingClientRect();
      const canvasTopOnPage = (canvasRect?.top ?? 0) + window.scrollY;
      const canvasLeftOnPage = (canvasRect?.left ?? 0) + window.scrollX;

      messages.send({
        type: 'scroll',
        top: Math.max(0, window.scrollY - canvasTopOnPage),
        left: Math.max(0, window.scrollX - canvasLeftOnPage),
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useOnMessage((msg) => {
    console.log('Received message in Editor:', msg.type);
    if (msg.type === 'updateDocument' || msg.type === 'init') {
      setBoardDocument(msg.document);
    }
    if (msg.type === 'cursorTrackingChanged') {
      setCursorTrackingEnabled(msg.enabled);
    }
    if (msg.type === 'toolChanged') {
      setActiveTool(msg.tool.type);
      if (msg.tool.type === EditorToolId.FREEHAND && msg.tool.parameters) {
        setFreehandParams(msg.tool.parameters);
      }
    }
    if (msg.type === 'viewportUpdate') {
      setProjectorViewport(msg.viewport);
    }
  });

  useEffect(() => {
    const setFocus = () => {
      messages.send({ type: 'focus' });
    };
    window.addEventListener('focus', setFocus);
    return () => {
      window.removeEventListener('focus', setFocus);
    };
  }, []);

  return (
    <>
      <div className="relative">
        {boardDocument && (
          <EditorCanvas
            document={boardDocument}
            // Pass onCursorMove only when tracking is enabled.
            // When undefined, EditorCanvas skips rAF entirely — no CPU cost.
            onCursorMove={cursorTrackingEnabled ? handleCursorMove : undefined}
            onCursorLeave={handleCursorLeave}
            onElementSelect={handleElementSelect}
            freehandActive={activeTool === EditorToolId.FREEHAND}
            freehandColor={freehandParams.color}
            freehandWidth={freehandParams.width}
            onAddElement={handleAddElement}
            onFreehandPreview={handleFreehandPreview}
          />
        )}
        {projectorViewport && (
          <div
            className="absolute border-2 pointer-events-none z-9999 border-activity-error-badge-background"
            style={{
              left: projectorViewport.left,
              top: projectorViewport.top,
              width: projectorViewport.width,
              height: projectorViewport.height,
            }}
          />
        )}
      </div>
    </>
  );
}

init(Editor);
