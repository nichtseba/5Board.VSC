export const FIVEBOARDZ_MANIFEST_PATH = 'manifest.json';
export const DEFAULT_CONTENT_PATH = 'content.json';
export const DEFAULT_SOURCE_ROOT = 'src/java';
export const DEFAULT_ASSET_ROOT = 'assets';
export const DEFAULT_EXPORTS_ROOT = 'exports';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];
export type FiveBoardzContentObject =
  | FiveBoardzTextboxObject
  | FiveBoardzSectionObject
  | FiveBoardzCodeObject
  | FiveBoardzImageObject
  | FiveBoardzRectObject
  | FiveBoardzPathObject
  | FiveBoardzArrowObject
  | FiveBoardzEllipseObject
  | FiveBoardzPolylineObject
  | FiveBoardzGroupObject;

export interface FiveBoardzObjectBase {
  type: string;
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

  fill?: JsonValue;
  fillRule?: string;
  backgroundColor?: string;
  stroke?: JsonValue;
  strokeWidth?: number;
  strokeDashArray?: JsonValue;
  strokeDashOffset?: number;
  strokeLineCap?: string;
  strokeLineJoin?: string;
  strokeMiterLimit?: number;
  strokeUniform?: boolean;

  shadow?: JsonValue;
  clipTo?: JsonValue;
  paintFirst?: string;
  globalCompositeOperation?: string;
  transformMatrix?: JsonValue;
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

export interface FiveBoardzTextObjectBase extends FiveBoardzObjectBase {
  text?: string;

  fontSize?: number;
  fontWeight?: string | number;
  fontFamily?: string;
  fontStyle?: string;
  lineHeight?: number;
  textAlign?: string;
  styles?: JsonValue;
  fontDisplayName?: string;
  charSpacing?: number;
  minWidth?: number;
  splitByGrapheme?: boolean;

  textBackgroundColor?: string;
  underline?: boolean;
  overline?: boolean;
  linethrough?: boolean;
}

export interface FiveBoardzTextboxObject extends FiveBoardzTextObjectBase {
  type: 'textbox';

  isSpeakerNote?: boolean;
  displayName?: string;
}

export interface FiveBoardzSectionObject extends FiveBoardzTextObjectBase {
  type: 'section';

  sectionLevel?: string;
  numbering?: string;
}

export interface FiveBoardzCodeObject extends FiveBoardzTextObjectBase {
  type: 'code';

  errors?: JsonArray | null;
  codeClass?: string;
  codeClassBlockId?: number;
  codeIsCommentedOut?: boolean;
  codeOrder?: number;
  codeSourceOffset?: number;
  isCode?: boolean;
}

export interface FiveBoardzImageObject extends FiveBoardzObjectBase {
  type: 'image';

  src?: string;
  altText?: string;
  crossOrigin?: string;
  cropX?: number;
  cropY?: number;
  filters?: JsonArray;
  hideInExport?: boolean;
  isSpeakerNote?: boolean;
  displayName?: string;
}

export interface FiveBoardzRectObject extends FiveBoardzObjectBase {
  type: 'rect';

  rx?: number;
  ry?: number;
  modifyFill?: boolean;
  modifyRadius?: boolean;
  displayName?: string;
}

export interface FiveBoardzPathObject extends FiveBoardzObjectBase {
  type: 'path';

  path?: JsonArray;
  strokeDash?: string;
  displayName?: string;
  isSpeakerNote?: boolean;
}

export interface FiveBoardzArrowObject extends FiveBoardzObjectBase {
  type: 'arrow';

  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  arrowHead?: string;
  strokeDash?: string;
}

export interface FiveBoardzEllipseObject extends FiveBoardzObjectBase {
  type: 'ellipse';

  rx?: number;
  ry?: number;
  modifyFill?: boolean;
}

export interface FiveBoardzPolylineObject extends FiveBoardzObjectBase {
  type: 'polyline';

  points?: JsonArray;
  modifyFill?: boolean;
}

export interface FiveBoardzGroupObject extends FiveBoardzObjectBase {
  type: 'group';

  objects?: FiveBoardzContentObject[];
  isSpeakerNote?: boolean;
  displayName?: string;
}

export interface FiveBoardzContent {
  version?: string;
  objects: FiveBoardzContentObject[];
  background?: string;
  snapAngle?: number;
  revealOrder?: number;
}

export interface FiveBoardzManifest {
  title: string;
  createdAt: string;
  modifiedAt: string;
  contentPath: string;
  sourceRoot: string;
  assetRoot: string;
  exportsRoot?: string;
}

export interface FiveBoardzSourceFile {
  name: string;
  path: string;
  language: string;
  code: string;
}

export interface FiveBoardzAsset {
  path: string;
  mime: string;
  bytes: Uint8Array;
}

export interface FiveBoardzDocument {
  manifest: FiveBoardzManifest;
  content: FiveBoardzContent;
  sources: FiveBoardzSourceFile[];
  assets: FiveBoardzAsset[];
}

export interface Old5boardClass {
  name: string;
  code: string;
  currentBlockId?: number;
}

export interface Old5boardDocument {
  content: JsonObject;
  classes: Old5boardClass[];
}

// erstellt Manifest für ein neues .5boardz Dokument
export function create5boardzManifest(title: string, now = new Date()): FiveBoardzManifest {
  const timestamp = now.toISOString();

  return {
    title,
    createdAt: timestamp,
    modifiedAt: timestamp,
    contentPath: DEFAULT_CONTENT_PATH,
    sourceRoot: DEFAULT_SOURCE_ROOT,
    assetRoot: DEFAULT_ASSET_ROOT,
    exportsRoot: DEFAULT_EXPORTS_ROOT,
  };
}

//Funktion die prüft ob der Übergebene Wert ein JSON Objekt ist
export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

//Validiert ob die manifest.json erwarete und richtige Felder hat
export function validate5boardzManifest(value: unknown): FiveBoardzManifest {
  if (!isJsonObject(value)) {
    throw new Error('manifest.json muss ein JSON Objekt sein.');
  }

  //manifest.json Felder prüfen und in speichern
  const title = readRequiredString(value, 'title');
  const createdAt = readRequiredString(value, 'createdAt');
  const modifiedAt = readRequiredString(value, 'modifiedAt');
  const contentPath = readRequiredString(value, 'contentPath');
  const sourceRoot = readRequiredString(value, 'sourceRoot');
  const assetRoot = readRequiredString(value, 'assetRoot');
  const exportsRoot = readOptionalString(value, 'exportsRoot');

  return {
    title,
    createdAt,
    modifiedAt,
    contentPath,
    sourceRoot,
    assetRoot,
    ...(exportsRoot ? { exportsRoot } : {}),
  };
}

//validates the content.json of a .5boardz file and checks if it has the expected structure and fields, returns the parsed content as a FiveBoardzContent object if valid
export function validateFiveBoardzContent(value: unknown): FiveBoardzContent {
  if (!isJsonObject(value)) {
    throw new Error('content.json has to be a JSON object.');
  }

  if (!Array.isArray(value.objects)) {
    throw new Error('content.json must contain an objects array.');
  }

  return {
    ...value,
    objects: value.objects.map((entry, index) =>
      validateFiveBoardzContentObject(entry, `objects[${index}]`),
    ),
  } as FiveBoardzContent;
}

export function validateFiveBoardzContentObject(
  value: unknown,
  path = 'object',
): FiveBoardzContentObject {
  if (!isJsonObject(value)) {
    throw new Error(`${path} has to be a JSON object.`);
  }

  if (typeof value.type !== 'string') {
    throw new Error(`${path}.type has to be a string.`);
  }

  //switch case for every currently supported object type
  switch (value.type) {
    case 'textbox':
      return value as unknown as FiveBoardzTextboxObject;
    case 'section':
      return value as unknown as FiveBoardzSectionObject;
    case 'code':
      return value as unknown as FiveBoardzCodeObject;
    case 'image':
      return value as unknown as FiveBoardzImageObject;
    case 'rect':
      return value as unknown as FiveBoardzRectObject;
    case 'path':
      return value as unknown as FiveBoardzPathObject;
    case 'arrow':
      return value as unknown as FiveBoardzArrowObject;
    case 'ellipse':
      return value as unknown as FiveBoardzEllipseObject;
    case 'polyline':
      return value as unknown as FiveBoardzPolylineObject;
    case 'group':
      return validateFiveBoardzGroupObject(value, path);
    default:
      throw new Error(`${path}.type "${value.type}" is not supported.`);
  }
}

//validates groups objects and its nested objects recursively
function validateFiveBoardzGroupObject(value: JsonObject, path: string): FiveBoardzGroupObject {
  if (value.objects === undefined) {
    return value as unknown as FiveBoardzGroupObject;
  }

  if (!Array.isArray(value.objects)) {
    throw new Error(`${path}.objects has to be an array.`);
  }

  return {
    ...value,
    objects: value.objects.map((entry, index) =>
      validateFiveBoardzContentObject(entry, `${path}.objects[${index}]`),
    ),
  } as FiveBoardzGroupObject;
}

//checks if the .5board file is a valid JSON file
export function validateOld5boardDocument(value: unknown): Old5boardDocument {
  if (!isJsonObject(value)) {
    throw new Error('.5board files have to be a JSON object');
  }

  //checks if a content section exists
  if (!('content' in value)) {
    throw new Error('Old .5board files must contain a content section.');
  }

  //Structure Check
  const contentValue = value.content;
  if (!isJsonObject(contentValue)) {
    throw new Error('content section of old .5board files must be a JSON object');
  }

  if (!Array.isArray(contentValue.objects)) {
    throw new Error('content section of old .5board files must contain an objects array');
  }

  //checks if a classes section exists
  const classesValue = value.classes;
  if (!Array.isArray(classesValue)) {
    throw new Error('Old .5board files must contain a classes array.');
  }

  const classes = classesValue.map((entry, index) => {
    if (!isJsonObject(entry)) {
      throw new Error(`Old class at index ${index} must be an object.`);
    }

    //checks for the required fields for a class
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
    content: contentValue,
    classes,
  };
}

//Prüft ob Werte vorhanden sind und Strings sind
function readRequiredString(value: JsonObject, key: string): string {
  const field = value[key];
  if (typeof field !== 'string' || field.length === 0) {
    throw new Error(`Expected manifest field "${key}" to be a non-empty string.`);
  }

  return field;
}

//Prüft ob optionale Werte ein String ist
function readOptionalString(value: JsonObject, key: string): string | undefined {
  const field = value[key];
  if (field === undefined) {
    return undefined;
  }

  if (typeof field !== 'string' || field.length === 0) {
    throw new Error(`Expected manifest field "${key}" to be a non-empty string.`);
  }

  return field;
}
