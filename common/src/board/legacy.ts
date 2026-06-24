import { BoardManifest } from './document.js';

export type LegacyObject =
  | LegacyTextboxObject
  | LegacySectionObject
  | LegacyCodeObject
  | LegacyImageObject
  | LegacyRectObject
  | LegacyPathObject
  | LegacyArrowObject
  | LegacyEllipseObject
  | LegacyPolylineObject
  | LegacyGroupObject;

export interface LegacyObjectBase {
  version?: string;
  id?: string;

  left?: number;
  top?: number;
  width?: number;
  height?: number;

  scaleX?: number;
  scaleY?: number;
  angle?: number;
  opacity?: number;

  visible?: boolean;
  hidden?: boolean;

  fill?: unknown;
  fillRule?: string;
  backgroundColor?: string;
  stroke?: unknown;
  strokeWidth?: number;
  strokeDashArray?: unknown;
  strokeDashOffset?: number;
  strokeLineCap?: string;
  strokeLineJoin?: string;
  strokeMiterLimit?: number;
  strokeUniform?: boolean;

  shadow?: unknown;
  clipTo?: unknown;
  paintFirst?: string;
  globalCompositeOperation?: string;
  transformMatrix?: unknown;
  skewX?: number;
  skewY?: number;

  originX?: string;
  originY?: string;
  flipX?: boolean;
  flipY?: boolean;

  selectable?: boolean;
  canBeSelected?: boolean;
  revealOrder?: number;
  sectionId?: string;
  snapAngle?: number;
  objectCaching?: boolean;
}

export interface LegacyTextObjectBase extends LegacyObjectBase {
  text?: string;

  fontSize?: number;
  fontWeight?: string | number;
  fontFamily?: string;
  fontStyle?: string;
  lineHeight?: number;
  textAlign?: string;
  styles?: unknown;
  fontDisplayName?: string;
  charSpacing?: number;
  minWidth?: number;
  splitByGrapheme?: boolean;

  textBackgroundColor?: string;
  underline?: boolean;
  overline?: boolean;
  linethrough?: boolean;
}

export interface LegacyTextboxObject extends LegacyTextObjectBase {
  type: 'textbox';

  isSpeakerNote?: boolean;
  displayName?: string;
}

export interface LegacySectionObject extends LegacyTextObjectBase {
  type: 'section';

  sectionLevel?: string;
  numbering?: string;
}

export interface LegacyCodeObject extends LegacyTextObjectBase {
  type: 'code';

  errors?: unknown;
  codeClass?: string;
  codeClassBlockId?: number;
  codeIsCommentedOut?: boolean;
  codeOrder?: number;
  codeSourceOffset?: number;
  isCode?: boolean;
}

export interface LegacyImageObject extends LegacyObjectBase {
  type: 'image';

  src?: string;
  altText?: string;
  crossOrigin?: string;
  cropX?: number;
  cropY?: number;
  filters?: Array<unknown>;
  hideInExport?: boolean;
  isSpeakerNote?: boolean;
  displayName?: string;
}

export interface LegacyRectObject extends LegacyObjectBase {
  type: 'rect';

  rx?: number;
  ry?: number;
  modifyFill?: boolean;
  modifyRadius?: boolean;
  displayName?: string;
}

export interface LegacyPathObject extends LegacyObjectBase {
  type: 'path';

  path?: Array<unknown>;
  strokeDash?: string;
  displayName?: string;
  isSpeakerNote?: boolean;
}

export interface LegacyArrowObject extends LegacyObjectBase {
  type: 'arrow';

  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  arrowHead?: string;
  strokeDash?: string;
}

export interface LegacyEllipseObject extends LegacyObjectBase {
  type: 'ellipse';

  rx?: number;
  ry?: number;
  modifyFill?: boolean;
}

export interface LegacyPolylineObject extends LegacyObjectBase {
  type: 'polyline';

  points?: Array<unknown>;
  modifyFill?: boolean;
}

export interface LegacyGroupObject extends LegacyObjectBase {
  type: 'group';

  objects?: LegacyObject[];
  isSpeakerNote?: boolean;
  displayName?: string;
}

export interface LegacyClass {
  name: string;
  code: string;
  currentBlockId?: number;
}

export interface LegacyContent {
  version?: string;
  objects: LegacyObject[];
  background?: string;
  snapAngle?: number;
  revealOrder?: number;
}

export interface LegacyDocument {
  content: LegacyContent;
  classes: LegacyClass[];
}

// erstellt Manifest für ein neues .5boardz Dokument
export function create5boardzManifest(title: string, now = new Date()): BoardManifest {
  const timestamp = now.getTime();

  return {
    title,
    createdAt: timestamp,
    modifiedAt: timestamp,
    version: '4.0.0',
  };
}

//Funktion die prüft ob der Übergebene Wert ein JSON Objekt ist
export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

//Validiert ob die manifest.json erwarete und richtige Felder hat
export function validateManifest(value: unknown): BoardManifest {
  if (!isJsonObject(value)) {
    throw new Error('manifest.json muss ein JSON Objekt sein.');
  }

  //manifest.json Felder prüfen und in speichern
  const title = readRequiredString(value, 'title');
  const createdAt = Number(readRequiredString(value, 'createdAt'));
  const modifiedAt = Number(readRequiredString(value, 'modifiedAt'));
  const version = readRequiredString(value, 'version');

  return {
    title,
    createdAt,
    modifiedAt,
    version,
  };
}

//Prüft ob die .5board Datei eine JSON Datei ist
export function validateOld5boardDocument(value: unknown): LegacyDocument {
  if (!isJsonObject(value)) {
    throw new Error('.5board Dateien müssen ein JSON Objekt sein');
  }

  //Prüft ob ein content Abschnitt existiert
  if (!('content' in value)) {
    throw new Error('Alte .5board Dateien müssen einen content Abschnitt enthalten.');
  }

  //Structure Check
  const contentValue = value.content;
  if (!isJsonObject(contentValue)) {
    throw new Error('content section of old .5board files must be a JSON object');
  }

  if (!Array.isArray(contentValue.objects)) {
    throw new Error('content section of old .5board files must contain an objects array');
  }

  //Prüft ob ein classes Abschnitt existiert
  const classesValue = value.classes;
  if (!Array.isArray(classesValue)) {
    throw new Error('Alte .5board Dateien müssen ein classes Array enthalten.');
  }

  const classes = classesValue.map((entry, index) => {
    if (!isJsonObject(entry)) {
      throw new Error(`Alte Klasse an Index ${index} muss ein Objekt sein.`);
    }

    //Prüft auf die erforderlichen Felder für eine Klasse
    const name = readRequiredString(entry, 'name');
    const code = readRequiredString(entry, 'code');
    const currentBlockId =
      typeof entry.currentBlockId === 'number' ? entry.currentBlockId : undefined;

    return {
      name,
      code,
      ...(currentBlockId === undefined ? {} : { currentBlockId }),
    };
  });

  return {
    content: value.content as unknown as LegacyContent,
    classes,
  };
}

//Prüft ob Werte vorhanden sind und Strings sind
function readRequiredString(value: Record<string, unknown>, key: string): string {
  const field = value[key];
  if (typeof field !== 'string' || field.length === 0) {
    throw new Error(`Expected manifest field "${key}" to be a non-empty string.`);
  }

  return field;
}
