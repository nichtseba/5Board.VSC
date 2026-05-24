import vscode from 'vscode';
import { BoardPackage } from './package';

export class FiveBoardDocument implements vscode.CustomDocument {
  public static readonly VIEW_TYPE = '5board-vsc.editor';

  packageUri?: vscode.Uri;

  public static async load(uri: vscode.Uri): Promise<FiveBoardDocument> {
    const boardPackage = await BoardPackage.read(uri);
    return new FiveBoardDocument(uri, boardPackage);
  }

  constructor(
    public readonly uri: vscode.Uri,
    public boardPackage: BoardPackage,
  ) {}

  dispose(): void {
    /* no document resources */
  }

  public async reloadDocument(): Promise<void> {
    this.boardPackage = await BoardPackage.read(this.uri);
  }

  public async saveDocument(targetUri?: vscode.Uri): Promise<void> {
    targetUri ??= this.uri;
    this.boardPackage.write(targetUri);
    this.packageUri = targetUri;
  }
}
