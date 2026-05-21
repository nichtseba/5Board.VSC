import { createRoot } from 'react-dom/client';
import { createLocalizationContext, LocalizationContext } from './components/LocalizationContext';

export function init(RootComponent: React.ComponentType) {
  function start() {
    const root = createRoot(document.getElementById('root')!);

    const language = 'de'; // TODO: Get this from the extension with MessageService
    const localizationContext = createLocalizationContext(language);

    root.render(
      <LocalizationContext.Provider value={localizationContext}>
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
