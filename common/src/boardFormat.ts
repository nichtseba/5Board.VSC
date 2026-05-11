export const FIVEBOARDZ_MANIFEST_PATH = 'manifest.json';
export const DEFAULT_CONTENT_PATH = 'content.json';
export const DEFAULT_SOURCE_ROOT = 'src/java';
export const DEFAULT_ASSET_ROOT = 'assets';
export const DEFAULT_EXPORTS_ROOT = 'exports';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];

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
  content: JsonValue;
  sources: FiveBoardzSourceFile[];
  assets: FiveBoardzAsset[];
}

export interface Old5boardClass {
  name: string;
  code: string;
  currentBlockId?: number;
}

export interface Old5boardDocument {
  content: JsonValue;
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

//Prüft ob die .5board Datei eine JSON Datei ist
export function validateOld5boardDocument(value: unknown): Old5boardDocument {
  if (!isJsonObject(value)) {
    throw new Error('.5board Dateien müssen ein JSON Objekt sein');
  }

  //Prüft ob ein content Abschnitt existiert
  if (!('content' in value)) {
    throw new Error('Alte .5board Dateien müssen einen content Abschnitt enthalten.');
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
    content: value.content,
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
