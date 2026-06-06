import path from 'path';
import * as vscode from 'vscode';
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from '5board.vsc-common';
import { HtmlExportService, type HtmlExportResult } from '../HtmlExportService';
import { FiveBoardDocument } from './document';
import { setExportPreviewWebviewHtml } from './webview';

export class FiveBoardExportPreviewProvider implements vscode.CustomReadonlyEditorProvider<FiveBoardDocument> {
  private readonly htmlExportService = new HtmlExportService();

  // Stores extension context for resolving preview webview assets.
  constructor(private readonly context: vscode.ExtensionContext) {}

  // Loads the .5boardz document for the readonly preview editor.
  public async openCustomDocument(
    uri: vscode.Uri,
    _openContext: vscode.CustomDocumentOpenContext,
    _token: vscode.CancellationToken,
  ): Promise<FiveBoardDocument> {
    return FiveBoardDocument.load(uri);
  }

  // Wires the preview webview to refresh and save export messages.
  public resolveCustomEditor(
    document: FiveBoardDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): void {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')],
    };

    let currentExport = this.generateExport(document);

    webviewPanel.webview.onDidReceiveMessage(async (msg: WebviewToExtensionMessage) => {
      switch (msg.type) {
        case 'ready':
          this.postPreview(webviewPanel.webview, document, currentExport);
          break;
        case 'refreshHtmlExportPreview':
          await document.reloadDocument();
          currentExport = this.generateExport(document);
          this.postPreview(webviewPanel.webview, document, currentExport);
          break;
        case 'saveHtmlExport':
          await this.saveHtmlExport(document, currentExport.html);
          break;
        default:
          break;
      }
    });

    webviewPanel.title = `HTML Export: ${vscode.workspace.asRelativePath(document.uri, false)}`;
    setExportPreviewWebviewHtml(this.context, webviewPanel.webview);
  }

  // Generates the current HTML export result for the loaded package.
  private generateExport(document: FiveBoardDocument): HtmlExportResult {
    return this.htmlExportService.generate(document.boardPackage.document, document.uri.fsPath);
  }

  // Sends generated HTML and warnings to the preview webview.
  private postPreview(
    webview: vscode.Webview,
    document: FiveBoardDocument,
    exportResult: HtmlExportResult,
  ): void {
    webview.postMessage({
      type: 'htmlExportPreviewLoaded',
      html: exportResult.html,
      fileName: document.uri.fsPath,
      warnings: exportResult.warnings,
    } satisfies ExtensionToWebviewMessage);
  }

  // Opens a save dialog and writes the generated HTML file.
  private async saveHtmlExport(document: FiveBoardDocument, html: string): Promise<void> {
    const defaultUri = vscode.Uri.file(
      path.join(
        path.dirname(document.uri.fsPath),
        `${path.basename(document.uri.fsPath, path.extname(document.uri.fsPath))}.html`,
      ),
    );
    const targetUri = await vscode.window.showSaveDialog({
      defaultUri,
      filters: {
        HTML: ['html', 'htm'],
      },
      saveLabel: 'Save HTML Export',
    });

    if (!targetUri) {
      return;
    }

    await vscode.workspace.fs.writeFile(targetUri, new TextEncoder().encode(html));
    vscode.window.showInformationMessage(`HTML export saved: ${targetUri.fsPath}`);
  }
}
