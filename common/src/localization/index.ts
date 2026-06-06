import en from './en.json';
import de from './de.json';

// Garantees that all translations have the same keys, otherwise TypeScript will throw an error
type Translations = Readonly<typeof en>;

// Type system black magic to extract all possible translation keys as string literals
type JoinPath<Prefix extends string, Key extends string> = Prefix extends ''
  ? Key
  : `${Prefix}.${Key}`;
type ExtractTranslationKeys<T, Prefix extends string = ''> =
  T extends object
    ? {
        [K in keyof T & string]: T[K] extends object
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

type TranslationNode = {
  [key: string]: string | TranslationNode;
};

export function normalizeLanguage(language: string): Language {
  return language.startsWith('de') ? 'de' : 'en';
}

function getNestedValue(obj: TranslationNode, path: string): string | undefined {
  const result = path.split('.').reduce<string | TranslationNode | undefined>((acc, part) => {
    if (acc && typeof acc === 'object') {
      return acc[part];
    }

    return undefined;
  }, obj);
  return typeof result === 'string' ? result : undefined;
}

export function t(language: Language, key: TranslationKey): string {
  const locale = normalizeLanguage(language);
  const value = getNestedValue(TRANSLATIONS[locale], key);
  return typeof value === 'string' ? value : key;
}
