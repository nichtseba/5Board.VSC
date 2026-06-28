import { useEffect, useState } from 'react';
import { useMessageService, useOnMessage } from '../services/MessageService';
//import { useLocalization } from '../providers/LocalizationProvider';
import { init } from '../app/init';
import EditorCanvas from '../components/canvas/EditorCanvas';
import ProjectorViewPort from '../components/projector/ProjectorViewPort';
import ProjectorCursorMirror from '../components/projector/ProjectorCursorMirror';
import { useBoardDocument } from '../providers/BoardDocumentProvider';
import { CanvasEventsProvider } from '../providers/CanvasEventsProvider';
import { useGrid } from '../providers/GridProvider';

export default function Editor() {
  const messages = useMessageService();
  //const { t } = useLocalization();
  const boardDocument = useBoardDocument();

  // Whether the pointer should be mirrored to the projector (tracking on AND a beamer open).
  const [mirrorActive, setMirrorActive] = useState(false);
  // use GridProvider to get metrics
  const { metrics } = useGrid();

  useEffect(() => {
    messages.send({ type: 'ready' });
    messages.send({ type: 'focus', focus: true });
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      messages.send({
        type: 'scroll',
        top: Math.max(0, window.scrollY - metrics.top),
        left: Math.max(0, window.scrollX - metrics.left),
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, [messages, metrics.top, metrics.left]);

  useOnMessage((msg) => {
    if (msg.type === 'cursorMirrorActiveChanged') {
      setMirrorActive(msg.active);
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
        <ProjectorViewPort />
      </div>
    </>
  );
}

init(Editor);
