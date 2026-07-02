import { TextDecorationStyle } from './element';

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type HeadingNumberingFormat =
  | 'none'
  | 'decimal'
  | 'lower-alpha'
  | 'upper-alpha'
  | 'lower-roman'
  | 'upper-roman';

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
  numberingFormat?: HeadingNumberingFormat;
  levels?: Partial<Record<HeadingLevel, HeadingLevelSettings>>;
};

export const DEFAULT_HEADING_NUMBERING_FORMAT: HeadingNumberingFormat = 'decimal';

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
