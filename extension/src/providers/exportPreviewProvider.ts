import * as vscode from 'vscode';
import type { WebviewToExtensionMessage } from '5board.vsc-common';
import { PackageManager } from '../PackageManager';
import { BoardCustomDocument } from '../board/BoardCustomDocument';
import { setExportPreviewWebviewHtml } from '../board/webview';

export class ExportPreviewProvider implements vscode.CustomReadonlyEditorProvider<BoardCustomDocument> {
  public static readonly VIEW_TYPE = '5board-vsc.exportPreview';

  constructor(
    private context: vscode.ExtensionContext,
    private packageManager: PackageManager,
    private getActiveEditorDocument: () => BoardCustomDocument | null,
  ) {}

  /*
   * Loads FiveBoardDocument uri because it is needed as uri-ankor for vscode readOnlyEditor
   * does not generate the Preview from said document!
   */
  async openCustomDocument(
    uri: vscode.Uri,
    openContext: vscode.CustomDocumentOpenContext,
    _token: vscode.CancellationToken,
  ): Promise<BoardCustomDocument> {
    const pkg = await this.packageManager.getOrLoadPackage(uri, openContext);
    return new BoardCustomDocument(pkg, uri);
  }

  // Sets up the readonly export preview webview and sends it the board document when it is ready
  async resolveCustomEditor(
    document: BoardCustomDocument,
    panel: vscode.WebviewPanel,
  ): Promise<void> {
    const editorDocument = this.getActiveEditorDocument() ?? document;
    const messages = editorDocument.messageService;

    messages.registerPanel(panel);

    panel.webview.onDidReceiveMessage(async (msg: WebviewToExtensionMessage) => {
      if (msg.type === 'ready') {
        panel.webview.postMessage({
          type: 'initExportPreview',
          document: editorDocument.boardPackage.document,
        });
      }

      if (msg.type === 'saveHtmlExport') {
        await messages.saveLatestHtmlExport();
      }
    });
    panel.webview.options = { enableScripts: true };
    setExportPreviewWebviewHtml(this.context, panel.webview);
  }

  public register(): void {
    this.context.subscriptions.push(
      vscode.window.registerCustomEditorProvider(ExportPreviewProvider.VIEW_TYPE, this, {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      }),
    );
  }
}
