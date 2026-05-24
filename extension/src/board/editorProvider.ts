import * as vscode from 'vscode';

import { FiveBoardDocument } from './document';
import { get5boardzAssetCacheRoot, setEditorWebviewHtml } from './webview';

export class FiveBoardEditorProvider implements vscode.CustomEditorProvider<FiveBoardDocument> {
  // Todo: Actually fire this event whenever the document changes, so the editor knows to update
  onDidChangeCustomDocument;

  constructor(private context: vscode.ExtensionContext) {
    this.onDidChangeCustomDocument = new vscode.EventEmitter<
      vscode.CustomDocumentContentChangeEvent<FiveBoardDocument>
    >().event;
  }

  saveCustomDocumentAs(
    document: FiveBoardDocument,
    destination: vscode.Uri,
    _cancellation: vscode.CancellationToken,
  ): Thenable<void> {
    return document.saveDocument(destination);
  }

  async openCustomDocument(
    uri: vscode.Uri,
    _openContext: vscode.CustomDocumentOpenContext,
    _token: vscode.CancellationToken,
  ): Promise<FiveBoardDocument> {
    // Todo: Implement openContext data
    return FiveBoardDocument.load(uri);
  }

  async resolveCustomEditor(
    document: FiveBoardDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    const assetCacheRoot = get5boardzAssetCacheRoot(this.context, document.uri);

    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'media'),
        this.context.globalStorageUri,
        assetCacheRoot,
      ],
    };

    // Todo: Replace with actual document title
    webviewPanel.title = `5Board: ${vscode.workspace.asRelativePath(document.uri, false)}`;

    setEditorWebviewHtml(this.context, webviewPanel.webview);
  }

  async saveCustomDocument(
    document: FiveBoardDocument,
    _cancellation: vscode.CancellationToken,
  ): Promise<void> {
    await document.saveDocument();
  }
  async revertCustomDocument(
    document: FiveBoardDocument,
    _cancellation: vscode.CancellationToken,
  ): Promise<void> {
    await document.reloadDocument();
  }

  async backupCustomDocument(
    document: FiveBoardDocument,
    backupContext: vscode.CustomDocumentBackupContext,
    _cancellation: vscode.CancellationToken,
  ): Promise<vscode.CustomDocumentBackup> {
    await document.saveDocument(backupContext.destination);

    return {
      id: backupContext.destination.toString(),
      delete: async () => {
        await vscode.workspace.fs.delete(backupContext.destination, { recursive: false });
      },
    };
  }
}
