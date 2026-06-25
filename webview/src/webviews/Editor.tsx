import { useEffect, useState } from 'react';
import { useMessageService, useOnMessage } from '../services/MessageService';
//import { useLocalization } from '../providers/LocalizationProvider';
import { init } from '../app/init';
import EditorCanvas from '../components/canvas/EditorCanvas';
import ProjectorViewPort, { ProjectorViewport } from '../components/projector/ProjectorViewPort';
import { useBoardDocument } from '../providers/BoardDocumentProvider';
import { CanvasEventsProvider } from '../providers/CanvasEventsProvider';

export default function Editor() {
  const messages = useMessageService();
  //const { t } = useLocalization();
  const boardDocument = useBoardDocument();

  // Cursor tracking is toggled from the sidebar
  const [cursorTrackingEnabled, setCursorTrackingEnabled] = useState(false);
  const [projectorViewport, setProjectorViewport] = useState<ProjectorViewport | null>(null);

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

  useEffect(() => {
    messages.send({ type: 'ready' });
    messages.send({ type: 'focus', focus: true });
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
    if (msg.type === 'cursorTrackingChanged') {
      setCursorTrackingEnabled(msg.enabled);
    }
    // in Komponente ProjectorViewPort in projector Ordner mit Mouse
    if (msg.type === 'viewportUpdate') {
      setProjectorViewport(msg.viewport);
    }
  });

  return (
    <>
      <div className="relative">
        {boardDocument && (
          <CanvasEventsProvider>
            <EditorCanvas
              // Pass onCursorMove only when tracking is enabled.
              // When undefined, EditorCanvas skips rAF entirely — no CPU cost.
              onCursorMove={cursorTrackingEnabled ? handleCursorMove : undefined}
              onCursorLeave={handleCursorLeave}
            />
          </CanvasEventsProvider>
        )}
        <ProjectorViewPort viewport={projectorViewport} />
      </div>
    </>
  );
}

init(Editor);
