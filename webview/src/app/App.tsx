import GridProvider from '../providers/GridProvider';
import { LocalizationProvider } from '../providers/LocalizationProvider';

export function App({ RootComponent }: { RootComponent: React.ComponentType }) {
  return (
    <LocalizationProvider>
      <GridProvider>
        <RootComponent />
      </GridProvider>
    </LocalizationProvider>
  );
}
