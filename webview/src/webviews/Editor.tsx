import { useEffect, useState } from 'react';
import { useMessageService, useOnMessage } from '../services/MessageService';
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
  //const { t } = useLocalization();
  const boardDocument = useBoardDocument();

  // Whether the pointer should be mirrored to the projector (tracking on AND a beamer open).
  const [mirrorActive, setMirrorActive] = useState(false);
  const [projectorOpen, setProjectorOpen] = useState(false);

  useEffect(() => {
    messages.send({ type: 'ready' });
    messages.send({ type: 'focus', focus: true });
  }, []);

  useOnMessage((msg) => {
    if (msg.type === 'projectorStateChanged') {
      setMirrorActive(msg.active);
      setProjectorOpen(msg.open);
    }
  });

  return (
    <>
      <div className="relative">
        {boardDocument && (
          <CanvasEventsProvider>
            <EditorCanvas />
            <ProjectorCursorMirror active={mirrorActive} />
            {projectorOpen && <ProjectorScrollMirror />}
          </CanvasEventsProvider>
        )}
        <ProjectorViewPort />
      </div>
    </>
  );
}

init(Editor);
