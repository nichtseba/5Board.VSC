import path from 'path';
import { BoardPackage } from './board/package';
import * as vscode from 'vscode';
/**
 * Manages loaded BoardPackages, allowing for caching and reuse of packages across the extension.
 */
export class PackageManager {
  private packages: Map<string, WeakRef<BoardPackage>> = new Map();

  public async getOrLoadPackage(
    uri: vscode.Uri,
    openContext?: vscode.CustomDocumentOpenContext,
  ): Promise<BoardPackage> {
    const pkg = this.get(uri);
    if (pkg) {
      return pkg;
    }
    let toOpenUri = uri;
    if (openContext?.backupId) {
      toOpenUri = vscode.Uri.parse(openContext.backupId);
    }
    const loadedPkg = await BoardPackage.read(toOpenUri);
    this.set(uri, loadedPkg);
    return loadedPkg;
  }

  private get(uri: vscode.Uri): BoardPackage | null {
    const key = uriToKey(uri);
    const ref = this.packages.get(key);
    if (!ref) {
      return null;
    }
    const pkg = ref.deref();
    if (!pkg) {
      this.packages.delete(key);
      return null;
    }
    return pkg;
  }

  private set(uri: vscode.Uri, pkg: BoardPackage): void {
    this.packages.set(uriToKey(uri), new WeakRef(pkg));
  }
}

function uriToKey(uri: vscode.Uri): string {
  return path.resolve(uri.fsPath);
}
