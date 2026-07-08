import { useEffect } from 'react';
import { useMessageService } from '../services/MessageService';
//import { useLocalization } from '../providers/LocalizationProvider';
import { init } from '../app/init';
import EditorCanvas from '../components/canvas/EditorCanvas';
import ProjectorViewPort from '../components/projector/ProjectorViewPort';
import ProjectorCursorMirror from '../components/projector/ProjectorCursorMirror';
import ProjectorScrollMirror from '../components/projector/ProjectorScrollMirror';
import { useBoardDocument } from '../providers/BoardDocumentProvider';
import { CanvasEventsProvider } from '../providers/CanvasEventsProvider';

export default function Editor() {
  const messages = useMessageService();
  const boardDocument = useBoardDocument();

  useEffect(() => {
    messages.send({ type: 'ready' });
    messages.send({ type: 'focus', focus: true });
  }, []);

  useOnMessage((msg) => {
    if (msg.type === 'projectorStateChanged') {
      setMirrorActive(msg.active);
      setProjectorOpen(msg.open);
    }
    if (msg.type === 'goToElement') {
      const element = document.getElementById(msg.elementId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        messages.send({ type: 'selectElement', id: msg.elementId });
      }
    }
  });

  return (
    <>
      <div className="relative">
        {boardDocument && (
          <CanvasEventsProvider>
            <EditorCanvas />
            <ProjectorCursorMirror />
            <ProjectorScrollMirror />
          </CanvasEventsProvider>
        )}
        <ProjectorViewPort />
      </div>
    </>
  );
}

init(Editor);
