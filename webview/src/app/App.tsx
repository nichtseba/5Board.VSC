import { LocalizationProvider } from '../providers/LocalizationProvider';
import { BoardDocumentProvider } from '../providers/BoardDocumentProvider';
import { EditorStateProvider } from '../providers/EditorStateProvider';
import { GridProvider } from '../providers/GridProvider';
import { SettingsProvider } from '../providers/SettingsProvider';

export function App({ RootComponent }: { RootComponent: React.ComponentType }) {
  return (
    <LocalizationProvider>
      <SettingsProvider>
        <BoardDocumentProvider>
          <EditorStateProvider>
            <GridProvider>
              <RootComponent />
            </GridProvider>
          </EditorStateProvider>
        </BoardDocumentProvider>
      </SettingsProvider>
    </LocalizationProvider>
  );
}
