import { useEffect, useState } from 'react';
import { useMessageService, useOnMessage } from '../services/MessageService';
//import { useLocalization } from '../providers/LocalizationProvider';
import { init } from '../app/init';
import EditorCanvas from '../components/canvas/EditorCanvas';
import ProjectorViewPort, { ProjectorViewport } from '../components/projector/ProjectorViewPort';
import ProjectorCursorMirror from '../components/projector/ProjectorCursorMirror';
import { useBoardDocument } from '../providers/BoardDocumentProvider';
import { CanvasEventsProvider } from '../providers/CanvasEventsProvider';

export default function Editor() {
  const messages = useMessageService();
  //const { t } = useLocalization();
  const boardDocument = useBoardDocument();

  // Whether the pointer should be mirrored to the projector (tracking on AND a beamer open).
  // The extension computes this; held here (top level) so the initial sync is never missed.
  const [mirrorActive, setMirrorActive] = useState(false);
  const [projectorViewport, setProjectorViewport] = useState<ProjectorViewport | null>(null);

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
    if (msg.type === 'cursorMirrorActiveChanged') {
      setMirrorActive(msg.active);
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
            <EditorCanvas />
            <ProjectorCursorMirror active={mirrorActive} />
          </CanvasEventsProvider>
        )}
        <ProjectorViewPort viewport={projectorViewport} />
      </div>
    </>
  );
}

init(Editor);
