import en from './en.json';
import de from './de.json';

export type LocalizationContextType = {
  language: string;
  t: (key: string) => string;
};

const translations = {
  en,
  de,
};

function normalizeLanguage(language: string): 'de' | 'en' {
  return language.startsWith('de') ? 'de' : 'en';
}

function getNestedValue(obj: Record<string, any>, path: string): unknown {
  return path.split('.').reduce((acc, part) => {
    if (acc && typeof acc === 'object') {
      return acc[part];
    }

    return undefined;
  }, obj);
}

export function t(language: string, key: string): string {
  const locale = normalizeLanguage(language);
  const value = getNestedValue(translations[locale], key);
  return typeof value === 'string' ? value : key;
}
