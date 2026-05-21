import en from './en.json';
import de from './de.json';

type Translations = Readonly<typeof en>;

const EN_TRANSLATIONS: Translations = en;
const DE_TRANSLATIONS: Translations = de;

// Type system black magic to extract all possible translation keys as string literals
type JoinPath<Prefix extends string, Key extends string> = Prefix extends ''
  ? Key
  : `${Prefix}.${Key}`;
type ExtractTranslationKeys<T, Prefix extends string = ''> =
  T extends Record<string, unknown>
    ? {
        [K in keyof T & string]: T[K] extends Record<string, unknown>
          ? ExtractTranslationKeys<T[K], JoinPath<Prefix, K>>
          : JoinPath<Prefix, K>;
      }[keyof T & string]
    : never;

export type TranslationKey = ExtractTranslationKeys<Translations>;

const TRANSLATIONS = {
  en,
  de,
} as const;

export type Language = keyof typeof TRANSLATIONS;

export function normalizeLanguage(language: string): Language {
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

export function t(language: Language, key: TranslationKey): string {
  const locale = normalizeLanguage(language);
  const value = getNestedValue(TRANSLATIONS[locale], key);
  return typeof value === 'string' ? value : key;
}
