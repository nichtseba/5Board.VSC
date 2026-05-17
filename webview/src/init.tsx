import { createRoot } from 'react-dom/client';
import { LocalizationContext } from './components/LocalizationContext';
import { VsCodeContext } from './components/VsCode';

export function init(RootComponent: React.ComponentType) {
  function start() {
    const root = createRoot(document.getElementById('root')!);
    const language = 'en'; // TODO: Get this from the extension with MessageService
    root.render(
      <LocalizationContext.Provider value={{ language }}>
        <RootComponent />
      </LocalizationContext.Provider>,
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}
