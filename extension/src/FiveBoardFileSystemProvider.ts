import * as vscode from 'vscode';
import { PackageManager } from './PackageManager';
import JSZip from 'jszip';
import { FileSystemError } from 'vscode';
import { BoardPackage } from './board/package';

export const MANIFEST_PATH = 'manifest.json';
export const CONTENT_PATH = 'content.json';
export const PACKAGE_FILES = [MANIFEST_PATH, CONTENT_PATH] as const;
export const SRC_ROOT = 'src';
export const ASSET_ROOT = 'assets';
export const EXPORTS_ROOT = 'exports';
export const PACKAGE_DIRS = [SRC_ROOT, ASSET_ROOT, EXPORTS_ROOT] as const;

export const READONLY_PATHS = [MANIFEST_PATH, CONTENT_PATH, EXPORTS_ROOT] as const;

/**
 * Handles 5board uris of the form `5board:/path/to/fiveboard.5board#/path/inside/fiveboard`
 */
export class FiveBoardFileSystemProvider implements vscode.FileSystemProvider {
  private onDidChangeFileEmitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this.onDidChangeFileEmitter.event;

  public constructor(private readonly packageManager: PackageManager) {}

  watch(
    _uri: vscode.Uri,
    _options: { readonly recursive: boolean; readonly excludes: readonly string[] },
  ): vscode.Disposable {
    throw new Error('Method not implemented.');
  }

  private async getPackage(uri: vscode.Uri): Promise<BoardPackage> {
    const packageUri = uri.with({ fragment: '', scheme: 'file' });
    return await this.packageManager.getOrLoadPackage(packageUri);
  }

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    const pkg = await this.getPackage(uri);
    const path = uri.fragment;
    if (isReadonlyPath(path)) {
      return this.statReadonly(path, pkg);
    }
    if (isWritablePath(path)) {
      return this.statWritable(path, pkg, uri);
    }
    throw FileSystemError.FileNotFound(uri);
  }

  private statReadonly(path: ReadonlyPath, pkg: BoardPackage): vscode.FileStat {
    const file = {
      [MANIFEST_PATH]: pkg.document.manifest,
      [CONTENT_PATH]: pkg.document.content,
    }[path];
    const size = Buffer.byteLength(JSON.stringify(file), 'utf8');
    return {
      type: vscode.FileType.File,
      ctime: pkg.document.manifest.createdAt,
      mtime: pkg.document.manifest.modifiedAt,
      size,
      permissions: vscode.FilePermission.Readonly,
    };
  }

  private statWritable(path: WritablePath, pkg: BoardPackage, uri: vscode.Uri): vscode.FileStat {
    if ((PACKAGE_DIRS as readonly string[]).includes(path)) {
      // This is one of the root folders (src/, assets/, exports/)
      return {
        type: vscode.FileType.Directory,
        ctime: pkg.document.manifest.createdAt,
        mtime: pkg.document.manifest.modifiedAt,
        size: 0,
      };
    }
    if (path.startsWith(SRC_ROOT + '/')) {
      const srcPath = splitSrcPath(path);
      if (!srcPath) {
        throw FileSystemError.FileNotFound(uri);
      }
      const { language, name } = srcPath;
      const source = pkg.document.sources.find((s) => s.language === language && s.name === name);
      if (!source) {
        throw FileSystemError.FileNotFound(uri);
      }
      return {
        type: vscode.FileType.File,
        ctime: source.createdAt,
        mtime: source.modifiedAt,
        size: Buffer.byteLength(source.code, 'utf8'),
      };
    }
    if (path.startsWith(ASSET_ROOT + '/')) {
      const name = path.substring(ASSET_ROOT.length + 1);
      const asset = pkg.document.assets.find((a) => a.name === name);
      if (!asset) {
        throw FileSystemError.FileNotFound(uri);
      }
      return {
        type: vscode.FileType.File,
        ctime: asset.createdAt,
        mtime: asset.modifiedAt,
        size: asset.bytes.length,
      };
    }
    if (path.startsWith(EXPORTS_ROOT + '/')) {
      // Todo: Implement exports
      throw new Error('Exported files are not implemented yet');
    }
    // This should be unreachable because of the isWritablePath check in stat(), but we need it to satisfy the type checker
    throw new Error(
      `Unreachable code: ${path} is not a valid writable path but was not caught by isWritablePath.`,
      {
        cause: { path, uri },
      },
    );
  }

  async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    const pkg = await this.getPackage(uri);
    const path = uri.fragment;
    if (path === ASSET_ROOT) {
      return pkg.document.assets.map((asset) => [asset.name, vscode.FileType.File]);
    }
    if (path === SRC_ROOT) {
      const languages = new Set(pkg.document.sources.map((s) => s.language));
      return Array.from(languages).map((language) => [language, vscode.FileType.Directory]);
    }
    if (path.startsWith(SRC_ROOT + '/')) {
      const language = path.substring(SRC_ROOT.length + 1);
      const sources = pkg.document.sources.filter((s) => s.language === language);
      return sources.map((source) => [source.name, vscode.FileType.File]);
    }
    if (path === EXPORTS_ROOT) {
      // Todo: Implement exports
      throw new Error('Exported files are not implemented yet');
    }
    throw FileSystemError.FileNotFound(uri);
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    const pkg = await this.getPackage(uri);
    const path = uri.fragment;
    if (path === MANIFEST_PATH) {
      return Buffer.from(JSON.stringify(pkg.document.manifest), 'utf8');
    }
    if (path === CONTENT_PATH) {
      return Buffer.from(JSON.stringify(pkg.document.content), 'utf8');
    }
    if (path.startsWith(SRC_ROOT + '/')) {
      const srcPath = splitSrcPath(path);
      if (!srcPath) {
        throw FileSystemError.FileNotFound(uri);
      }
      const { language, name } = srcPath;
      const source = pkg.document.sources.find((s) => s.language === language && s.name === name);
      if (!source) {
        throw FileSystemError.FileNotFound(uri);
      }
      return Buffer.from(source.code, 'utf8');
    }
    if (path.startsWith(ASSET_ROOT + '/')) {
      const name = path.substring(ASSET_ROOT.length + 1);
      const asset = pkg.document.assets.find((a) => a.name === name);
      if (!asset) {
        throw FileSystemError.FileNotFound(uri);
      }
      return asset.bytes;
    }
    if (path.startsWith(EXPORTS_ROOT + '/')) {
      // Todo: Implement exports
      throw new Error('Exported files are not implemented yet');
    }
    throw FileSystemError.FileNotFound(uri);
  }

  async writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean },
  ): Promise<void> {
    const path = uri.fragment;
    if (!isWritablePath(path)) {
      throw FileSystemError.NoPermissions(uri);
    }
    const pkg = await this.getPackage(uri);
    if (path.startsWith(SRC_ROOT + '/')) {
      this.writeSrcFile(path, uri, pkg, content, options);
      return;
    }
    if (path.startsWith(ASSET_ROOT + '/')) {
      this.writeFile;
    }
  }

  private writeSrcFile(
    path: string,
    uri: vscode.Uri,
    pkg: BoardPackage,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean },
  ): void {
    const srcPath = splitSrcPath(path);
    if (!srcPath) {
      throw FileSystemError.FileNotFound(uri);
    }
    const { language, name } = srcPath;
    let source = pkg.document.sources.find((s) => s.language === language && s.name === name);
    if (source) {
      if (!options.overwrite) {
        throw FileSystemError.FileExists(uri);
      }
      source.code = Buffer.from(content).toString('utf8');
      source.modifiedAt = Date.now();
    } else {
      if (!options.create) {
        throw FileSystemError.FileNotFound(uri);
      }
      source = {
        language,
        name,
        code: Buffer.from(content).toString('utf8'),
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };
      pkg.document.sources.push(source);
    }
  }
}

type ReadonlyPath = (typeof PACKAGE_FILES)[number];

function isReadonlyPath(path: string): path is ReadonlyPath {
  return (PACKAGE_FILES as readonly string[]).includes(path);
}

type WriteableDir = (typeof PACKAGE_DIRS)[number];
type WritablePath = WriteableDir | `${WriteableDir}/${string}`;

function isWritablePath(path: string): path is WritablePath {
  for (const writablePath of PACKAGE_DIRS) {
    if (path.startsWith(writablePath)) {
      return true;
    }
  }
  return false;
}

function splitSrcPath(path: string): { language: string; name: string } | null {
  if (!path.startsWith(SRC_ROOT + '/')) {
    return null;
  }
  const relativePath = path.substring(SRC_ROOT.length + 1);
  const split = relativePath.indexOf('/');
  if (split === -1) {
    return null;
  }
  const language = relativePath.substring(0, split);
  const name = relativePath.substring(split + 1);
  return { language, name };
}
