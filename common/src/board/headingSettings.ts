import { HeadingElementData, TextDecorationStyle } from './element.js';

export type HeadingLevel = HeadingElementData['level'];

export type HeadingNumberingFormat =
  | 'none'
  | 'decimal'
  | 'lower-alpha'
  | 'upper-alpha'
  | 'lower-roman'
  | 'upper-roman';
export type HeadingNumberingStyle = Exclude<HeadingNumberingFormat, 'none'>;

export type HeadingLevelSettings = {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
  fontStyle?: 'normal' | 'italic' | 'oblique';
  textDecoration?: TextDecorationStyle;
  color?: string;
  backgroundColor?: string;
};

export type HeadingSettings = {
  numberingEnabled?: boolean;
  numberingFormats?: Partial<Record<HeadingLevel, HeadingNumberingStyle>>;
  /** @deprecated Use `numberingEnabled` and `numberingFormats` instead. */
  numberingFormat?: HeadingNumberingFormat;
  levels?: Partial<Record<HeadingLevel, HeadingLevelSettings>>;
};

export const DEFAULT_HEADING_NUMBERING_FORMAT: HeadingNumberingFormat = 'decimal';
export const DEFAULT_HEADING_NUMBERING_STYLE: HeadingNumberingStyle = 'decimal';

const DEFAULT_HEADING_LEVEL_SETTINGS: Record<HeadingLevel, HeadingLevelSettings> = {
  1: { fontSize: 36, fontWeight: 'bold' },
  2: { fontSize: 30, fontWeight: 'bold' },
  3: { fontSize: 24, fontWeight: 600 },
  4: { fontSize: 20, fontWeight: 600 },
  5: { fontSize: 18, fontWeight: 500 },
  6: { fontSize: 16, fontWeight: 500 },
};

export function getDefaultHeadingLevelSettings(level: HeadingLevel): HeadingLevelSettings {
  return DEFAULT_HEADING_LEVEL_SETTINGS[level];
}

export function getHeadingLevelSettings(
  settings: HeadingSettings | undefined,
  level: HeadingLevel,
): HeadingLevelSettings {
  return {
    ...getDefaultHeadingLevelSettings(level),
    ...settings?.levels?.[level],
    textDecoration: {
      ...getDefaultHeadingLevelSettings(level).textDecoration,
      ...settings?.levels?.[level]?.textDecoration,
    },
  };
}

export function getHeadingNumberingFormat(
  settings: HeadingSettings | undefined,
): HeadingNumberingFormat {
  return settings?.numberingFormat ?? DEFAULT_HEADING_NUMBERING_FORMAT;
}

export function getHeadingNumberingEnabled(settings: HeadingSettings | undefined): boolean {
  if (settings?.numberingEnabled !== undefined) {
    return settings.numberingEnabled;
  }

  return settings?.numberingFormat !== 'none';
}

export function getHeadingNumberingStyle(
  settings: HeadingSettings | undefined,
  level: HeadingLevel,
): HeadingNumberingStyle {
  if (settings?.numberingFormats) {
    return settings.numberingFormats[level] ?? DEFAULT_HEADING_NUMBERING_STYLE;
  }

  const legacyFormat = getHeadingNumberingFormat(settings);

  return legacyFormat === 'none' ? DEFAULT_HEADING_NUMBERING_STYLE : legacyFormat;
}
