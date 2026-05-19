import { createRoot } from 'react-dom/client';
import { LocalizationContext } from './components/LocalizationContext';
import { VsCodeContext } from './components/VsCode';
import { t as translate } from '5board.vsc-common';

export function init(RootComponent: React.ComponentType) {
  function start() {
    const root = createRoot(document.getElementById('root')!);

    const language = 'de'; // TODO: Get this from the extension with MessageService
    const t = (key: string) => translate(language, key);

    root.render(
      <LocalizationContext.Provider value={{ language, t }}>
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
