import { createRoot } from 'react-dom/client';
import './styles/global.css';

export function init(RootComponent: React.ComponentType) {
  function start() {
    const root = createRoot(document.getElementById('root')!);
    root.render(<RootComponent></RootComponent>);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}
