import { createRoot } from 'react-dom/client';
import { createLocalizationContext, LocalizationContext } from './components/LocalizationContext';
import { useOnMessage } from './services/MessageService';
import { Language } from '5board.vsc-common';
import { useMemo, useState } from 'react';

function App({ RootComponent }: { RootComponent: React.ComponentType }) {
  const [language, setLanguage] = useState<Language>('en');

  useOnMessage((msg) => {
    if (msg.type === 'init') {
      setLanguage(msg.language);
    }
  });

  const localizationContext = useMemo(() => createLocalizationContext(language), [language]);

  return (
    <LocalizationContext.Provider value={localizationContext}>
      <RootComponent />
    </LocalizationContext.Provider>
  );
}

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
