import { Language, TranslationKey, t as translate } from '5board.vsc-common';
import { createContext, useContext } from 'react';

export type LocalizationFunction = (key: TranslationKey) => string;

export type LocalizationContextType = {
  language: null | Language;
  t: LocalizationFunction;
};

function defaultLocalizationFunction(key: string): string {
  return key;
}

export function createLocalizationContext(language: Language): LocalizationContextType {
  return {
    language,
    t: (key: TranslationKey) => translate(language, key),
  };
}

export const LocalizationContext = createContext<LocalizationContextType>({
  language: null,
  t: defaultLocalizationFunction,
});

export function useLocalization() {
  return useContext(LocalizationContext);
}
