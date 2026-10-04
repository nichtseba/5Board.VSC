import { useEffect } from 'react';
import { useMessageService } from '../services/MessageService';
//import { useLocalization } from '../providers/LocalizationProvider';
import { init } from '../app/init';
import EditorCanvas from '../components/canvas/EditorCanvas';
import { SourcesProvider } from '../providers/SourcesProvider';
import { ExecutionOutputProvider } from '../providers/ExecutionOutputProvider';
import ProjectorViewPort from '../components/projector/ProjectorViewPort';
import ProjectorCursorMirror from '../components/projector/ProjectorCursorMirror';
import ProjectorScrollMirror from '../components/projector/ProjectorScrollMirror';
import { useBoardDocument } from '../providers/BoardDocumentProvider';
import { CanvasEventsProvider } from '../providers/CanvasEventsProvider';
import { FindProvider } from '../providers/FindProvider';
import FindWidget from '../components/find/FindWidget';
import { ViewTypeProvider } from '../providers/ViewTypeProvider';

export default function Editor() {
  const messages = useMessageService();
  const boardDocument = useBoardDocument();

  useEffect(() => {
    messages.send({ type: 'ready' });
    messages.send({ type: 'focus', focus: true });
  }, []);

  return (
    <FindProvider>
      <ViewTypeProvider value="editor">
        <div className="relative">
          {boardDocument && (
            <ExecutionOutputProvider>
              <SourcesProvider value={boardDocument.sources}>
                <CanvasEventsProvider>
                  <EditorCanvas enableKeyboardShortcuts />
                  <ProjectorCursorMirror />
                  <ProjectorScrollMirror />
                </CanvasEventsProvider>
              </SourcesProvider>
            </ExecutionOutputProvider>
          )}
          <ProjectorViewPort />
        </div>
        <FindWidget />
      </ViewTypeProvider>
    </FindProvider>
  );
}

init(Editor);
