import * as vscode from 'vscode';
import { PackageManager } from '../PackageManager';
import { BoardCustomDocument } from '../board/BoardCustomDocument';
import { setExportPreviewWebviewHtml } from '../board/webview';
import { EXTENSION } from '../extension';

export class ExportPreviewProvider implements vscode.CustomReadonlyEditorProvider<BoardCustomDocument> {
  public static readonly VIEW_TYPE = '5board-vsc.exportPreview';

  constructor(
    private context: vscode.ExtensionContext,
    private packageManager: PackageManager,
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
    _token: vscode.CancellationToken,
  ): Promise<void> {
    panel.webview.options = { enableScripts: true };
    const editorDocument = EXTENSION.getDocumentForUri(document.uri);
    const messages = editorDocument?.messageService ?? document.messageService;
    messages.registerPanel(panel);
    setExportPreviewWebviewHtml(this.context, panel.webview);
  }

  public register(): void {
    this.context.subscriptions.push(
      vscode.window.registerCustomEditorProvider(ExportPreviewProvider.VIEW_TYPE, this, {}),
    );
  }
}
