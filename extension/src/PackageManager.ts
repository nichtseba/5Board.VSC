import path from 'path';
import { BoardPackage } from './board/package';
import * as vscode from 'vscode';
import { BoardDocument } from '5board.vsc-common';
import { BoardCustomDocument } from './board/BoardCustomDocument';
/**
 * Manages loaded Documents, this is needed since the custom file system should update
 * the loaded package if it is loaded and the document on disc if it is not
 */
export class DocumentManager {
  private loadedDocuments: Map<string, BoardCustomDocument> = new Map();

  /**
   * @param uri The Uri of the document that is currently loaded
   * @param document The custom document instance that is currently loaded
   */
  public registerDocument(uri: vscode.Uri, document: BoardCustomDocument): void {
    this.loadedDocuments.set(uriToKey(uri), document);
  }

  /**
   * Unregisters the document associated with the given URI.
   * This should be called when the document is disposed.
   *
   * @param uri The Uri of the document to unregister
   */
  public unregisterDocument(uri: vscode.Uri): void {
    this.loadedDocuments.delete(uriToKey(uri));
  }

  /**
   * Applies an edit to the document associated with the given URI.
   * If the document is not currently loaded, it will be read from disk, the edit applied, and then written back to disk.
   * This ensures that edits are consistently applied whether the document is currently loaded in memory or only exists on disk.
   *
   * @param uri The Uri of the document to apply an edit to
   * @param edit The edit to apply to the document. Should return `null` if no actual change was made the edited document otherwise.
   */
  public async applyEdit(
    uri: vscode.Uri,
    edit: (document: BoardDocument) => BoardDocument | null,
  ): Promise<void> {
    const key = uriToKey(uri);
    if (!this.loadedDocuments.has(key)) {
      const board = await BoardPackage.read(uri);
      const next = edit(board.document);
      if (next) {
        board.document = next;
        board.write(uri);
      }
    } else {
      const document = this.loadedDocuments.get(key)!;
      document.applyEdit(edit);
    }
  }
  /**
   *
   * Retrieves the package associated with the given URI.
   * No changes should be made to the returned package, as it is intended to be read-only.
   * If you need to make changes externally use {@link applyEdit} instead.
   * @param uri Uri to get package for
   * @returns The in memory package if it is currently loaded as a custom document, otherwise reads it from disk
   */
  public async getPackageReadonly(uri: vscode.Uri): Promise<BoardPackage> {
    if (this.loadedDocuments.has(uriToKey(uri))) {
      return this.loadedDocuments.get(uriToKey(uri))!.boardPackage;
    }
    return await BoardPackage.read(uri);
  }
}

function uriToKey(uri: vscode.Uri): string {
  return path.resolve(uri.fsPath);
}
