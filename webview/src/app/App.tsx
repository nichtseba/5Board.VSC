import { LocalizationProvider } from '../providers/LocalizationProvider';

export function App({ RootComponent }: { RootComponent: React.ComponentType }) {
  return (
    <LocalizationProvider>
      <RootComponent />
    </LocalizationProvider>
  );
}
