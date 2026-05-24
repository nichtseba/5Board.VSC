import { createRoot } from 'react-dom/client';
import { App } from './App';

export function init(RootComponent: React.ComponentType) {
  function start() {
    const root = createRoot(document.getElementById('root')!);

    root.render(<App RootComponent={RootComponent} />);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}
