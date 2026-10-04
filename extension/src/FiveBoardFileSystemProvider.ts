import * as vscode from 'vscode';
import { FileSystemError } from 'vscode';
import {
  ASSET_ROOT,
  BoardPackage,
  CONTENT_PATH,
  EXPORTS_ROOT,
  MANIFEST_PATH,
  SRC_ROOT,
} from './board/package';
import { Asset, BoardDocument } from '5board.vsc-common';
import { DocumentManager } from './PackageManager';
import { randomUUID } from 'crypto';

/**
 * Handles 5board uris of the form `5board:/path/to/fiveboard.5board#/path/inside/fiveboard`
 */
export class FiveBoardFileSystemProvider implements vscode.FileSystemProvider {
  private onDidChangeFileEmitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this.onDidChangeFileEmitter.event;

  public constructor(private readonly packageManager: DocumentManager) {}

  public register(ctx: vscode.ExtensionContext): void {
    ctx.subscriptions.push(
      vscode.workspace.registerFileSystemProvider('5board', this, {
        isCaseSensitive: true,
      }),
    );
  }

  private watching = new Map<
    string,
    {
      uri: vscode.Uri;
      options: { readonly recursive: boolean; readonly excludes: readonly string[] };
    }
  >();

  watch(
    uri: vscode.Uri,
    options: { readonly recursive: boolean; readonly excludes: readonly string[] },
  ): vscode.Disposable {
    const key = randomUUID();
    this.watching.set(key, {
      uri,
      options: {
        recursive: options.recursive,
        excludes: options.excludes.map((exclude) => normalizeExcludePath(uri, exclude)),
      },
    });
    return {
      dispose: () => {
        this.watching.delete(key);
      },
    };
  }

  private fireChange(uri: vscode.Uri, type: vscode.FileChangeType): void {
    const event: vscode.FileChangeEvent = { uri, type };
    for (const { uri: watchUri, options } of this.watching.values()) {
      if (!isWatchedPath(watchUri.path, uri.path, options.recursive)) {
        continue;
      }
      if (options.excludes.some((excludePath) => isSameOrDescendantPath(excludePath, uri.path))) {
        continue;
      }
      this.onDidChangeFileEmitter.fire([event]);
      return;
    }
  }

  private async getPackageReadonly(uri: vscode.Uri): Promise<BoardPackage> {
    const split = splitPath(uri);
    if (!split) {
      throw FileSystemError.FileNotFound(uri);
    }
    const { packageUri } = split;
    return await this.packageManager.getPackageReadonly(packageUri);
  }

  private getPackageUri(uri: vscode.Uri): vscode.Uri {
    const split = splitPath(uri);
    if (!split) {
      throw FileSystemError.FileNotFound(uri);
    }
    return split.packageUri;
  }

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    const info = pathInfo(uri);
    if (!info) {
      throw FileSystemError.FileNotFound(uri);
    }
    const pkg = await this.getPackageReadonly(uri);
    switch (info.type) {
      case 'manifest':
      case 'content': {
        const obj = {
          manifest: pkg.document.manifest,
          content: pkg.document.content,
        }[info.type];
        const size = Buffer.byteLength(JSON.stringify(obj), 'utf8');
        return {
          type: vscode.FileType.File,
          ctime: pkg.document.manifest.createdAt,
          mtime: pkg.document.manifest.modifiedAt,
          size,
          permissions: vscode.FilePermission.Readonly,
        };
      }
      case 'directory': {
        return {
          type: vscode.FileType.Directory,
          ctime: pkg.document.manifest.createdAt,
          mtime: pkg.document.manifest.modifiedAt,
          size: 0,
        };
      }
      case 'source': {
        const source = pkg.document.sources.find(
          (s) => s.language === info.language && s.name === info.name,
        );
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
      case 'asset': {
        const asset = pkg.document.assets.find((a) => a.name === info.name);
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
      case 'export': {
        throw new Error('Exported files are not implemented yet');
      }
    }
  }

  async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    const info = pathInfo(uri);
    if (!info) {
      throw FileSystemError.FileNotFound(uri);
    }
    if (info.type !== 'directory') {
      throw FileSystemError.FileNotADirectory(uri);
    }
    const pkg = await this.getPackageReadonly(uri);
    if (info.path === SRC_ROOT) {
      const languages = new Set(pkg.document.sources.map((s) => s.language));
      return Array.from(languages).map((language) => [language, vscode.FileType.Directory]);
    }
    if (info.path.startsWith(SRC_ROOT + '/')) {
      const language = info.path.substring(SRC_ROOT.length + 1);
      return pkg.document.sources
        .filter((s) => s.language === language)
        .map((s) => [s.name, vscode.FileType.File]);
    }
    if (info.path === ASSET_ROOT) {
      return pkg.document.assets.map((asset) => [asset.name, vscode.FileType.File]);
    }
    if (info.path === EXPORTS_ROOT) {
      throw new Error('Exported files are not implemented yet');
    }
    if (info.path === '') {
      return [
        [MANIFEST_PATH, vscode.FileType.File],
        [CONTENT_PATH, vscode.FileType.File],
        [ASSET_ROOT, vscode.FileType.Directory],
        [SRC_ROOT, vscode.FileType.Directory],
        [EXPORTS_ROOT, vscode.FileType.Directory],
      ];
    }
    throw new Error('Unreachable code: Invalid directory path');
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    const info = pathInfo(uri);
    if (!info) {
      throw FileSystemError.FileNotFound(uri);
    }
    const pkg = await this.getPackageReadonly(uri);
    switch (info.type) {
      case 'directory': {
        throw FileSystemError.FileIsADirectory(uri);
      }
      case 'manifest':
      case 'content': {
        const obj = {
          manifest: pkg.document.manifest,
          content: pkg.document.content,
        }[info.type];
        return Buffer.from(JSON.stringify(obj), 'utf8');
      }
      case 'source': {
        const source = pkg.document.sources.find(
          (s) => s.language === info.language && s.name === info.name,
        );
        if (!source) {
          throw FileSystemError.FileNotFound(uri);
        }
        return Buffer.from(source.code, 'utf8');
      }
      case 'asset': {
        const asset = pkg.document.assets.find((a) => a.name === info.name);
        if (!asset) {
          throw FileSystemError.FileNotFound(uri);
        }
        return asset.bytes;
      }
      case 'export': {
        throw new Error('Exported files are not implemented yet');
      }
    }
  }

  async writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean },
  ): Promise<void> {
    const info = pathInfo(uri);
    if (!info) {
      throw FileSystemError.FileNotFound(uri);
    }
    if (!info.writeable) {
      throw FileSystemError.NoPermissions(uri);
    }
    switch (info.type) {
      case 'directory': {
        throw FileSystemError.FileIsADirectory(uri);
      }
      case 'source': {
        await this.writeSrcFile(info.path, uri, content, options);
        break;
      }
      case 'asset': {
        await this.writeAssetFile(info.path, uri, content, options);
        break;
      }
    }
  }

  private async writeSrcFile(
    path: string,
    uri: vscode.Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean },
  ): Promise<void> {
    const srcPath = splitSrcPath(path);
    if (!srcPath) {
      throw FileSystemError.FileNotFound(uri);
    }
    const { language, name } = srcPath;
    let changeType = vscode.FileChangeType.Changed;
    await this.packageManager.applyEdit(this.getPackageUri(uri), (document) => {
      const source = document.sources.find((s) => s.language === language && s.name === name);
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
        changeType = vscode.FileChangeType.Created;
        document.sources.push({
          language,
          name,
          code: Buffer.from(content).toString('utf8'),
          createdAt: Date.now(),
          modifiedAt: Date.now(),
        });
      }
      return document;
    });
    this.fireChange(uri, changeType);
  }

  private async writeAssetFile(
    path: string,
    uri: vscode.Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean },
  ): Promise<void> {
    const assetName = path.substring(ASSET_ROOT.length + 1);
    let changeType = vscode.FileChangeType.Changed;
    await this.packageManager.applyEdit(this.getPackageUri(uri), (document) => {
      const asset = document.assets.find((a) => a.name === assetName);
      if (asset) {
        if (!options.overwrite) {
          throw FileSystemError.FileExists(uri);
        }
        asset.bytes = content;
        asset.modifiedAt = Date.now();
      } else {
        if (!options.create) {
          throw FileSystemError.FileNotFound(uri);
        }
        changeType = vscode.FileChangeType.Created;
        const created: Asset = {
          name: assetName,
          bytes: content,
          createdAt: Date.now(),
          modifiedAt: Date.now(),
          mime: 'application/octet-stream', // Todo: Store and read actual mime types for assets
        };
        document.assets.push(created);
      }
      return document;
    });
    this.fireChange(uri, changeType);
  }

  createDirectory(uri: vscode.Uri): void {
    throw FileSystemError.NoPermissions(uri);
  }

  delete(uri: vscode.Uri, _options: { recursive: boolean }): void {
    const info = pathInfo(uri);
    if (!info) {
      throw FileSystemError.FileNotFound(uri);
    }
    if (info.type !== 'directory') {
      throw FileSystemError.FileIsADirectory(uri);
    }
    throw FileSystemError.NoPermissions(uri);
  }

  async rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    options: { overwrite: boolean },
  ): Promise<void> {
    const oldInfo = pathInfo(oldUri);
    if (!oldInfo) {
      throw FileSystemError.FileNotFound(oldUri);
    }
    const newInfo = pathInfo(newUri);
    if (!newInfo) {
      throw FileSystemError.FileNotFound(newUri);
    }
    if (oldInfo.path !== newInfo.path) {
      throw FileSystemError.NoPermissions(oldUri);
    }
    if (oldInfo.type !== newInfo.type) {
      throw FileSystemError.NoPermissions(newUri);
    }
    if (!oldInfo.writeable || !newInfo.writeable) {
      throw FileSystemError.NoPermissions(oldUri);
    }
    const changes: [vscode.Uri, vscode.FileChangeType][] = [];
    await this.packageManager.applyEdit(this.getPackageUri(oldUri), (document) => {
      this.applyRename(document, oldUri, newUri, oldInfo, newInfo, options, changes);
      return document;
    });
    for (const [changedUri, type] of changes) {
      this.fireChange(changedUri, type);
    }
  }

  private applyRename(
    document: BoardDocument,
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    oldInfo: PathInfo,
    newInfo: PathInfo,
    options: { overwrite: boolean },
    changes: [vscode.Uri, vscode.FileChangeType][],
  ): void {
    const fireChange = (uri: vscode.Uri, type: vscode.FileChangeType): void => {
      changes.push([uri, type]);
    };
    if (oldInfo.type === 'directory') {
      if (oldInfo.path.startsWith(SRC_ROOT + '/')) {
        const languages = new Set(document.sources.map((s) => s.language));
        const oldLanguage = oldInfo.path.substring(SRC_ROOT.length + 1);
        const newLanguage = newInfo.path.substring(SRC_ROOT.length + 1);
        if (!languages.has(oldLanguage)) {
          throw FileSystemError.FileNotFound(oldUri);
        }
        if (languages.has(newLanguage)) {
          if (options.overwrite) {
            for (const source of document.sources) {
              if (source.language === newLanguage) {
                fireChange(vscode.Uri.joinPath(newUri, source.name), vscode.FileChangeType.Deleted);
              }
            }
            document.sources = document.sources.filter((s) => s.language !== newLanguage);
          } else {
            throw FileSystemError.FileExists(newUri);
          }
        }
        for (const source of document.sources) {
          if (source.language === oldLanguage) {
            source.language = newLanguage;
            fireChange(vscode.Uri.joinPath(oldUri, source.name), vscode.FileChangeType.Deleted);
            fireChange(vscode.Uri.joinPath(newUri, source.name), vscode.FileChangeType.Created);
          }
        }
      } else {
        throw FileSystemError.NoPermissions(oldUri);
      }
    } else if (oldInfo.type === 'source' && newInfo.type === 'source') {
      const oldSource = document.sources.find(
        (s) => s.language === oldInfo.language && s.name === oldInfo.name,
      );
      if (!oldSource) {
        throw FileSystemError.FileNotFound(oldUri);
      }
      const newSource = document.sources.find(
        (s) => s.language === newInfo.language && s.name === newInfo.name,
      );
      if (newSource) {
        if (!options.overwrite) {
          throw FileSystemError.FileExists(newUri);
        }
        document.sources = document.sources.filter((s) => s !== newSource);
      }
      oldSource.language = newInfo.language;
      oldSource.name = newInfo.name;
      oldSource.modifiedAt = Date.now();
      fireChange(oldUri, vscode.FileChangeType.Deleted);
      fireChange(newUri, newSource ? vscode.FileChangeType.Changed : vscode.FileChangeType.Created);
    } else if (oldInfo.type === 'asset' && newInfo.type === 'asset') {
      const oldAsset = document.assets.find((a) => a.name === oldInfo.name);
      if (!oldAsset) {
        throw FileSystemError.FileNotFound(oldUri);
      }
      const newAsset = document.assets.find((a) => a.name === newInfo.name);
      if (newAsset) {
        if (!options.overwrite) {
          throw FileSystemError.FileExists(newUri);
        }
        document.assets = document.assets.filter((a) => a !== newAsset);
      }
      oldAsset.name = newInfo.name;
      oldAsset.modifiedAt = Date.now();
      fireChange(oldUri, vscode.FileChangeType.Deleted);
      fireChange(newUri, newAsset ? vscode.FileChangeType.Changed : vscode.FileChangeType.Created);
    }
  }
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

type PathInfo = {
  path: string;
} & (
  | { type: 'manifest' | 'content'; writeable: false }
  | { type: 'directory'; writeable: boolean }
  | { type: 'asset'; name: string; writeable: true }
  | { type: 'source'; language: string; name: string; writeable: true }
  | { type: 'export'; name: string; writeable: false }
);

function splitPath(uri: vscode.Uri): { packageUri: vscode.Uri; path: string } | null {
  const EXT = '.5boardz/';
  const split = uri.path.indexOf(EXT);
  if (split === -1) {
    return null;
  }
  const packagePath = uri.path.substring(0, split + EXT.length - 1);
  return {
    packageUri: uri.with({
      path: packagePath,
      fragment: '',
      scheme: 'file',
    }),
    path: uri.path.substring(split + EXT.length),
  };
}

function pathInfo(uri: vscode.Uri): PathInfo | null {
  const split = splitPath(uri);
  if (!split) {
    return null;
  }
  const { path } = split;
  if ([MANIFEST_PATH, CONTENT_PATH].includes(path)) {
    const type = ({ [MANIFEST_PATH]: 'manifest', [CONTENT_PATH]: 'content' } as const)[path]!;
    return { path, type, writeable: false };
  }
  if ([ASSET_ROOT, SRC_ROOT, EXPORTS_ROOT, ''].includes(path)) {
    return { path, type: 'directory', writeable: [ASSET_ROOT, SRC_ROOT].includes(path) };
  }
  if (path.startsWith(SRC_ROOT + '/')) {
    const srcPath = path.substring(SRC_ROOT.length + 1);
    let parts = srcPath.split('/');
    if (parts.length === 2 && parts[1].length === 0) {
      // Trailing slash
      parts = [parts[0]];
    }
    if (parts.length > 2) {
      return null;
    }
    if (parts.length === 1) {
      // This is the language directory, which is writeable
      return { path, type: 'directory', writeable: true };
    }
    const [language, name] = parts;
    return { path, type: 'source', language, name, writeable: true };
  }
  if (path.startsWith(ASSET_ROOT + '/')) {
    const name = path.substring(ASSET_ROOT.length + 1);
    return { path, type: 'asset', name, writeable: true };
  }
  if (path.startsWith(EXPORTS_ROOT + '/')) {
    const name = path.substring(EXPORTS_ROOT.length + 1);
    return { path, type: 'export', name, writeable: false };
  }
  return null;
}

function normalizeExcludePath(watchUri: vscode.Uri, exclude: string): string {
  if (containsGlobSyntax(exclude)) {
    throw new Error(
      `Glob excludes are not supported by the 5board file system provider: ${exclude}`,
    );
  }

  const normalizedExclude = normalizePath(exclude);
  if (normalizedExclude.startsWith('/')) {
    return normalizedExclude;
  }

  return normalizePath(vscode.Uri.joinPath(watchUri, normalizedExclude).path);
}

function isWatchedPath(watchPath: string, changedPath: string, recursive: boolean): boolean {
  const normalizedWatchPath = normalizePath(watchPath);
  const normalizedChangedPath = normalizePath(changedPath);

  if (normalizedWatchPath === normalizedChangedPath) {
    return true;
  }

  if (recursive) {
    return isSameOrDescendantPath(normalizedWatchPath, normalizedChangedPath);
  }

  return isDirectChildPath(normalizedWatchPath, normalizedChangedPath);
}

function isSameOrDescendantPath(parentPath: string, candidatePath: string): boolean {
  const normalizedParentPath = normalizePath(parentPath);
  const normalizedCandidatePath = normalizePath(candidatePath);

  return (
    normalizedParentPath === normalizedCandidatePath ||
    normalizedCandidatePath.startsWith(normalizedParentPath + '/')
  );
}

function isDirectChildPath(parentPath: string, candidatePath: string): boolean {
  const normalizedParentPath = normalizePath(parentPath);
  const normalizedCandidatePath = normalizePath(candidatePath);

  if (!normalizedCandidatePath.startsWith(normalizedParentPath + '/')) {
    return false;
  }

  return !normalizedCandidatePath.substring(normalizedParentPath.length + 1).includes('/');
}

function containsGlobSyntax(path: string): boolean {
  return /[*?[\]{}]/.test(path);
}

function normalizePath(path: string): string {
  const slashNormalized = path.replace(/\\/g, '/');
  const withoutTrailingSlash = slashNormalized.replace(/\/+$/, '');
  return withoutTrailingSlash === '' ? '/' : withoutTrailingSlash;
}
