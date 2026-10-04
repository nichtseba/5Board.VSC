import * as vscode from 'vscode';
import { BoardPackage } from '../board/package';
import { setEditorWebviewHtml } from '../board/webview';
import { BoardCustomDocument } from '../board/BoardCustomDocument';
import { DocumentManager } from '../PackageManager';

export class EditorEditorProvider implements vscode.CustomEditorProvider<BoardCustomDocument> {
  public static readonly VIEW_TYPE = '5board-vsc.editor';

  private didChangeCustomDocument = new vscode.EventEmitter<
    vscode.CustomDocumentEditEvent<BoardCustomDocument>
  >();
  onDidChangeCustomDocument = this.didChangeCustomDocument.event;

  constructor(
    private context: vscode.ExtensionContext,
    private packageManager: DocumentManager,
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
    let pkg: BoardPackage;
    if (openContext.untitledDocumentData) {
      pkg = await BoardPackage.readBytes(openContext.untitledDocumentData);
    } else {
      if (openContext.backupId) {
        uri = vscode.Uri.parse(openContext.backupId);
      }
      pkg = await BoardPackage.read(uri);
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
    document.onDocumentChange(({ next, previous, isUndo, isRedo }) => {
      if (isUndo || isRedo) {
        return;
      }
      this.didChangeCustomDocument.fire({
        label: 'Document Change',
        document,
        undo() {
          document.applyEdit((_) => previous, { isUndo: true });
        },
        redo() {
          document.applyEdit((_) => next, { isRedo: true });
        },
      });
    });

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
        webviewOptions: {},
      }),
    );
  }
}
