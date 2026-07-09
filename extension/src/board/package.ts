import JSZip from 'jszip';
import * as vscode from 'vscode';
import {
  Asset,
  BoardContent,
  BoardDocument,
  BoardManifest,
  Source,
  create5boardzManifest,
} from '5board.vsc-common';
import { deriveCodeClasses } from './CodeblockSourceService';

export const MANIFEST_PATH = 'manifest.json';
export const CONTENT_PATH = 'content.json';
export const SRC_ROOT = 'src';
export const ASSET_ROOT = 'assets';
export const EXPORTS_ROOT = 'exports';

export class BoardPackage {
  public readonly documentChange = new vscode.EventEmitter<void>();
  public readonly onDocumentChange = this.documentChange.event;

  public static async read(uri: vscode.Uri): Promise<BoardPackage> {
    const packageBytes = await vscode.workspace.fs.readFile(uri);
    const zip = await JSZip.loadAsync(packageBytes);
    const manifest = await readJson<BoardManifest>(zip, MANIFEST_PATH);

    // Content, source code, and assets are stored as separate files in the ZIP
    const content = await readJson<BoardContent>(zip, CONTENT_PATH);
    const sources = await readSources(zip);
    const assets = await readAssets(zip);

    // Documents saved before the class registry existed derive it from their named sources.
    content.codeClasses ??= deriveCodeClasses(content, sources);

    const document: BoardDocument = {
      manifest,
      content,
      sources,
      assets,
    };

    return new BoardPackage(document);
  }

  public static createEmpty(title: string): BoardPackage {
    const document: BoardDocument = {
      manifest: create5boardzManifest(title),
      content: {
        selectedElementId: null,
        elements: [],
        codeClasses: [],
        background: '',
        snapAngle: 0,
        revealOrder: -1,
      },
      sources: [],
      assets: [],
    };

    return new BoardPackage(document);
  }

  constructor(public document: BoardDocument) {}

  public async write(uri: vscode.Uri): Promise<void> {
    const zip = new JSZip();

    zip.file(MANIFEST_PATH, JSON.stringify(this.document.manifest));
    zip.file(CONTENT_PATH, JSON.stringify(this.document.content));

    // Each source write
    const src_zip = zip.folder(SRC_ROOT)!;
    for (const source of this.document.sources) {
      const lang_zip = src_zip.folder(source.language)!;
      lang_zip.file(source.name, source.code);
    }

    // Asset file write
    const asset_zip = zip.folder(ASSET_ROOT)!;
    for (const asset of this.document.assets) {
      asset_zip.file(asset.name, asset.bytes);
    }

    // Todo: Make this configureable
    const bytes = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6,
      },
    });

    await vscode.workspace.fs.writeFile(uri, bytes);
  }
}

async function readJson<T>(zip: JSZip, path: string): Promise<T> {
  const file = zip.file(path);

  if (!file) {
    throw new Error(`Fehlende Datei im Paket: ${path}`);
  }

  const text = await file.async('string');

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(`Failed to parse Json in ${path}`, { cause: error });
  }
}

async function readSources(zip: JSZip): Promise<Source[]> {
  const sources_zip = zip.folder(SRC_ROOT)!;

  const promises: Promise<Source>[] = [];

  sources_zip.forEach((languagePath, _file) => {
    const lang_zip = sources_zip.folder(languagePath)!;
    const language = languagePath.slice(0, -1); // Remove trailing slash from folder name
    lang_zip.forEach((relativePath, file) => {
      // We need to create a promise for each file, because the async reading of the file is done in a callback and we want to wait for all files to be read before returning
      const promise = new Promise<Source>(async (resolve, reject) => {
        try {
          const code = await file.async('string');
          const source: Source = {
            language: language,
            name: relativePath,
            code,
            createdAt: 0, // Todo: Store and read actual timestamps for sources
            modifiedAt: 0, // Todo: Store and read actual timestamps for sources
          };
          resolve(source);
        } catch (error) {
          reject(error);
        }
      });
      promises.push(promise);
    });
  });

  const sources = await Promise.all(promises);

  return sources;
}

async function readAssets(zip: JSZip): Promise<Asset[]> {
  const assets_zip = zip.folder(ASSET_ROOT)!;

  const promises: Promise<Asset>[] = [];

  assets_zip.forEach((relativePath, file) => {
    // We need to create a promise for each file, because the async reading of the file is done in a callback and we want to wait for all files to be read before returning
    const promise = new Promise<Asset>(async (resolve, reject) => {
      try {
        const bytes = await file.async('uint8array');
        const asset: Asset = {
          name: relativePath,
          mime: mimeFromFileName(relativePath),
          createdAt: 0, // Todo: Store and read actual timestamps for assets
          modifiedAt: 0,
          bytes,
        };
        resolve(asset);
      } catch (error) {
        reject(new Error(`Failed to load asset file "${relativePath}"`, { cause: error }));
      }
    });
    promises.push(promise);
  });

  const assets = await Promise.all(promises);

  return assets;
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
