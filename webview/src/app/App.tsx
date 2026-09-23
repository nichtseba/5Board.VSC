import { ErrorBoundary } from './ErrorBoundary';
import { LocalizationProvider } from '../providers/LocalizationProvider';
import { BoardDocumentProvider } from '../providers/BoardDocumentProvider';
import { EditorStateProvider } from '../providers/EditorStateProvider';
import { GridProvider } from '../providers/GridProvider';

export function App({ RootComponent }: { RootComponent: React.ComponentType }) {
  return (
    <ErrorBoundary>
      <LocalizationProvider>
        <BoardDocumentProvider>
          <EditorStateProvider>
            <GridProvider>
              <RootComponent />
            </GridProvider>
          </EditorStateProvider>
        </BoardDocumentProvider>
      </LocalizationProvider>
    </ErrorBoundary>
  );
}
