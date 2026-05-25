import { createContext, useContext, useMemo, useState } from 'react';
import { Language, TranslationKey, t as translate } from '5board.vsc-common';
import { useOnMessage } from '../services/MessageService';

export type LocalizationFunction = (key: TranslationKey) => string;
export type LocalizationContextType = {
  language: Language;
  t: LocalizationFunction;
};

function defaultLocalizationFunction(key: string): string {
  return key;
}

// Context
const LocalizationContext = createContext<LocalizationContextType>({
  language: 'en',
  t: defaultLocalizationFunction,
});

export function LocalizationProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  useOnMessage((msg) => {
    if (msg.type === 'init') {
      setLanguage(msg.language);
    }
  });

  const value = useMemo(
    () => ({
      language,
      t: (key: TranslationKey) => translate(language, key),
    }),
    [language],
  );

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

// Hook
export function useLocalization() {
  return useContext(LocalizationContext);
}
