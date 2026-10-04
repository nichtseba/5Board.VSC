import * as vscode from 'vscode';
import { setExportPreviewWebviewHtml } from '../board/webview';
import { EXTENSION } from '../extension';

// Preview does not have its own document state
class ExportPreviewDocument implements vscode.CustomDocument {
  constructor(public readonly uri: vscode.Uri) {}
  dispose(): void {}
}

export class ExportPreviewProvider implements vscode.CustomReadonlyEditorProvider<ExportPreviewDocument> {
  public static readonly VIEW_TYPE = '5board-vsc.exportPreview';

  constructor(private context: vscode.ExtensionContext) {}

  // Creates URI anchor required by VS Code for the readonly custom editor
  openCustomDocument(
    uri: vscode.Uri,
    _openContext: vscode.CustomDocumentOpenContext,
    _token: vscode.CancellationToken,
  ): ExportPreviewDocument {
    return new ExportPreviewDocument(uri);
  }

  // Sets up the export preview webview and registers it with the boardDocuments messageService
  async resolveCustomEditor(
    document: ExportPreviewDocument,
    panel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    panel.webview.options = { enableScripts: true };

    const activeDocument = EXTENSION.activeEditorDocument;

    const boardDocument =
      activeDocument?.uri.toString() === document.uri.toString()
        ? activeDocument
        : EXTENSION.getDocumentForUri(document.uri);

    if (boardDocument) {
      boardDocument.messageService.registerPanel(panel);
      const attachedDocument = boardDocument;

      const activeDocumentSubscription = EXTENSION.onActiveDocumentChange((activeDocument) => {
        if (
          activeDocument &&
          activeDocument !== attachedDocument &&
          activeDocument.uri.toString() === attachedDocument.uri.toString()
        ) {
          panel.dispose();
        }
      });

      panel.onDidDispose(() => {
        activeDocumentSubscription.dispose();
      });

      if (panel.active) {
        EXTENSION.activeEditorDocument = boardDocument;
      }
    }

    setExportPreviewWebviewHtml(this.context, panel.webview);
  }
  public register(): void {
    this.context.subscriptions.push(
      vscode.window.registerCustomEditorProvider(ExportPreviewProvider.VIEW_TYPE, this, {}),
    );
  }
}
