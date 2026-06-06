import * as vscode from 'vscode';

import { setEditorWebviewHtml } from '../board/webview';
import { BoardCustomDocument } from '../board/BoardCustomDocument';
import { PackageManager } from '../PackageManager';
import { DUMMY_BOARD_DOCUMENT } from '../board/dummyDocument';

export class EditorEditorProvider implements vscode.CustomEditorProvider<BoardCustomDocument> {
  public static readonly VIEW_TYPE = '5board-vsc.editor';

  // Todo: Actually fire this event whenever the document changes, so the editor knows to update

  private didChangeCustomDocument = new vscode.EventEmitter<
    vscode.CustomDocumentContentChangeEvent<BoardCustomDocument>
  >();
  onDidChangeCustomDocument = this.didChangeCustomDocument.event;

  constructor(
    private context: vscode.ExtensionContext,
    private packageManager: PackageManager,
  ) {}

  saveCustomDocumentAs(
    document: BoardCustomDocument,
    destination: vscode.Uri,
    _cancellation: vscode.CancellationToken,
  ): Thenable<void> {
    return document.saveDocument(destination);
  }

  async openCustomDocument(
    uri: vscode.Uri,
    openContext: vscode.CustomDocumentOpenContext,
    _token: vscode.CancellationToken,
  ): Promise<BoardCustomDocument> {
    const pkg = await this.packageManager.getOrLoadPackage(uri, openContext);

    // TODO: Remove once the file format is fully implemented.
    // Show dummy slides so the editor is not blank during development.
    if (pkg.document.content.elements.length === 0) {
      pkg.document.content = { ...DUMMY_BOARD_DOCUMENT.content };
    }

    return new BoardCustomDocument(pkg, uri);
  }

  async resolveCustomEditor(
    document: BoardCustomDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')],
    };

    document.messageService.registerPanel(webviewPanel);
    // Todo: Replace with actual document title
    webviewPanel.title = `5Board: ${vscode.workspace.asRelativePath(document.uri, false)}`;

    setEditorWebviewHtml(this.context, webviewPanel.webview);
  }

  async saveCustomDocument(
    document: BoardCustomDocument,
    _cancellation: vscode.CancellationToken,
  ): Promise<void> {
    await document.saveDocument();
  }

  async revertCustomDocument(
    document: BoardCustomDocument,
    _cancellation: vscode.CancellationToken,
  ): Promise<void> {
    await document.reloadDocument();
  }

  async backupCustomDocument(
    document: BoardCustomDocument,
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

  public register(): void {
    this.context.subscriptions.push(
      vscode.window.registerCustomEditorProvider(EditorEditorProvider.VIEW_TYPE, this, {
        supportsMultipleEditorsPerDocument: true,
      }),
    );
  }
}
