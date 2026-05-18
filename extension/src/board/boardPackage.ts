import JSZip from 'jszip';
import * as vscode from 'vscode';
import {
  FIVEBOARDZ_MANIFEST_PATH,
  FiveBoardzAsset,
  FiveBoardzContent,
  FiveBoardzDocument,
  FiveBoardzSourceFile,
  create5boardzManifest,
  JsonValue,
  validate5boardzManifest,
} from '5board.vsc-common';

export async function read5boardzPackage(uri: vscode.Uri): Promise<FiveBoardzDocument> {
  const packageBytes = await vscode.workspace.fs.readFile(uri);
  const zip = await JSZip.loadAsync(packageBytes);
  const manifest = validate5boardzManifest(await readJsonFile(zip, FIVEBOARDZ_MANIFEST_PATH));

  // Content, source code, and assets are stored as separate files in the ZIP
  const content = (await readJsonFile(zip, manifest.contentPath)) as unknown as FiveBoardzContent;
  const sources = await read5boardzSourceFiles(zip, manifest.sourceRoot);
  const assets = await read5boardzAssets(zip, manifest.assetRoot);

  return {
    manifest,
    content,
    sources,
    assets,
  };
}

export async function write5boardzPackage(
  uri: vscode.Uri,
  document: FiveBoardzDocument,
): Promise<void> {
  const zip = new JSZip();
  const manifest = validate5boardzManifest(document.manifest);

  zip.file(FIVEBOARDZ_MANIFEST_PATH, formatJson(manifest));
  zip.file(manifest.contentPath, formatJson(document.content));

  // Each source write
  for (const source of document.sources) {
    checkPackagePath(source.path);
    checkPathStartsWith(source.path, manifest.sourceRoot);
    zip.file(source.path, source.code);
  }

  // Asset file write
  for (const asset of document.assets) {
    checkPackagePath(asset.path);
    checkPathStartsWith(asset.path, manifest.assetRoot);
    zip.file(asset.path, asset.bytes);
  }

  // ZIP creation
  const bytes = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6,
    },
  });

  await vscode.workspace.fs.writeFile(uri, bytes);
}

// Creates a new .5boardz package
export function createEmpty5boardzPackage(title: string): FiveBoardzDocument {
  return {
    manifest: create5boardzManifest(title),
    content: {
      version: '3.6.6',
      objects: [],
      background: '',
      snapAngle: 0,
      revealOrder: -1,
    },
    sources: [],
    assets: [],
  };
}

// Formats JSON for readability
function formatJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

// Creates a path
export function makePackagePath(...parts: string[]): string {
  return parts
    .map((part) => part.replace(/^\/+|\/+$/g, ''))
    .filter((part) => part.length > 0)
    .join('/');
}

// Checks whether the path is valid
function checkPackagePath(path: string): void {
  if (path.length === 0 || path.includes('\\') || path.startsWith('/') || path.includes('..')) {
    throw new Error(`Ungültiger Pfad: ${path}`);
  }
}

// Checks whether the path is inside the expected directory
function checkPathStartsWith(path: string, root: string): void {
  checkPackagePath(root);
  if (!path.startsWith(`${root}/`)) {
    throw new Error(`Package path "${path}" is outside "${root}".`);
  }
}

// Removes characters from class name that are invalid for file names with "Class" as fallback
export function sanitizeJavaFileName(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed.replace(/[^A-Za-z0-9_$]/g, '_') : 'Class';
}

// Returns the file name without extension
export function sourceNameFromPath(path: string): string {
  const fileName = path.split('/').at(-1) ?? path;
  return fileName.replace(/\.[^.]+$/i, '');
}

// Returns the programming language based on the file extension (extendable later)
export function languageFromSourcePath(path: string): string {
  const lowerPath = path.toLowerCase();

  if (lowerPath.endsWith('.java')) {
    return 'java';
  }

  if (lowerPath.endsWith('.py')) {
    return 'python';
  }
  return 'text';
}

async function readJsonFile(zip: JSZip, path: string): Promise<JsonValue> {
  checkPackagePath(path);
  const file = zip.file(path);

  if (!file) {
    throw new Error(`Fehlende Datei im Paket: ${path}`);
  }

  const text = await file.async('string');

  try {
    return JSON.parse(text) as JsonValue;
  } catch (error) {
    throw new Error(`Ungültiges JSON in ${path}: ${errorMessage(error)}`);
  }
}

async function read5boardzSourceFiles(
  zip: JSZip,
  sourceRoot: string,
): Promise<FiveBoardzSourceFile[]> {
  const files = listZipFiles(zip, sourceRoot);
  const sources = await Promise.all(
    files.map(async (path) => {
      const file = zip.file(path);
      if (!file) {
        throw new Error(`Fehlende Quelldatei im Paket: ${path}`);
      }

      const code = await file.async('string');
      const language = languageFromSourcePath(path);
      return {
        name: sourceNameFromPath(path),
        path,
        language,
        code,
      };
    }),
  );

  return sources.sort((left, right) => left.path.localeCompare(right.path));
}

async function read5boardzAssets(zip: JSZip, assetRoot: string): Promise<FiveBoardzAsset[]> {
  const files = listZipFiles(zip, assetRoot);
  const assets = await Promise.all(
    files.map(async (path) => {
      const file = zip.file(path);
      if (!file) {
        throw new Error(`Fehlende Asset-Datei im Paket: ${path}`);
      }

      return {
        path,
        mime: mimeFromFileName(path),
        bytes: await file.async('uint8array'),
      };
    }),
  );

  return assets.sort((left, right) => left.path.localeCompare(right.path));
}

function listZipFiles(zip: JSZip, root: string): string[] {
  checkPackagePath(root);
  const files: string[] = [];

  zip.forEach((relativePath, file) => {
    if (file.dir || !relativePath.startsWith(`${root}/`)) {
      return;
    }

    checkPackagePath(relativePath);
    files.push(relativePath);
  });

  return files;
}

// returns mime type based on file extension
function mimeFromFileName(path: string): string {
  const lowerPath = path.toLowerCase();

  if (lowerPath.endsWith('.png')) {
    return 'image/png';
  }

  if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) {
    return 'image/jpeg';
  }

  if (lowerPath.endsWith('.gif')) {
    return 'image/gif';
  }

  if (lowerPath.endsWith('.webp')) {
    return 'image/webp';
  }

  if (lowerPath.endsWith('.svg')) {
    return 'image/svg+xml';
  }

  if (lowerPath.endsWith('.pdf')) {
    return 'application/pdf';
  }

  return 'application/octet-stream';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
