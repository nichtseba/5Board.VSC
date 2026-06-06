import * as vscode from 'vscode';

import { BoardCustomDocument } from '../board/BoardCustomDocument';
import { BoardPackage } from '../board/package';
import { get5boardzAssetCacheRoot } from '../board/webview';
import { t } from '../localization';
import { setProjectorWebviewHtml } from './webview';

/**
 * Read-only editor provider for the projector/beamer view.
 *
 * Uses CustomReadonlyEditorProvider instead of CustomEditorProvider because
 * the projector never modifies the document — it only displays it.
 *
 * VS Code will reuse the same BoardCustomDocument instance that the normal editor
 * already opened, so the file is only read once.
 */
export class ProjectorEditorProvider implements vscode.CustomReadonlyEditorProvider<BoardCustomDocument> {
  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Called by VS Code when the file needs to be loaded into memory.
   */
  async openCustomDocument(
    uri: vscode.Uri,
    _openContext: vscode.CustomDocumentOpenContext,
    _token: vscode.CancellationToken,
  ): Promise<BoardCustomDocument> {
    const boardPackage = await BoardPackage.read(uri);
    return new BoardCustomDocument(boardPackage, uri);
  }

  /**
   * Called by VS Code when a new webview panel is created for this document.
   * Sets up the webview options, registers it with the document's MessageService and
   * loads the Projector HTML.
   */
  async resolveCustomEditor(
    document: BoardCustomDocument,
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

    webviewPanel.title = `${t('extension.projector.title')}: ${document.boardPackage.document.manifest.title}`;

    // Use the document's own MessageService so the projector receives
    // the same init/updateDocument messages as the editor webviews.
    document.messageService.registerPanel(webviewPanel);

    setProjectorWebviewHtml(this.context, webviewPanel.webview);
  }
}
