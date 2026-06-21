import { BoardDocumentProvider } from '../providers/BoardDocumentProvider';
import { GridProvider } from '../providers/GridProvider';
import { LocalizationProvider } from '../providers/LocalizationProvider';

export function App({ RootComponent }: { RootComponent: React.ComponentType }) {
  return (
    <LocalizationProvider>
      <BoardDocumentProvider>
        <GridProvider>
          <RootComponent />
        </GridProvider>
      </BoardDocumentProvider>
    </LocalizationProvider>
  );
}
