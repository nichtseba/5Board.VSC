import * as vscode from 'vscode';

import { FiveBoardDocument } from '../board/document';
import { get5boardzAssetCacheRoot } from '../board/webview';
import { MessageService } from '../MessageService';
import { t } from '../localization';
import { setProjectorWebviewHtml } from './webview';
import path from 'path';

/**
 * Read-only editor provider for the projector/beamer view.
 *
 * Uses CustomReadonlyEditorProvider instead of CustomEditorProvider because
 * the projector never modifies the document — it only displays it.
 *
 * VS Code will reuse the same FiveBoardDocument instance that the normal editor
 * already opened, so the file is only read once.
 */
export class ProjectorEditorProvider implements vscode.CustomReadonlyEditorProvider<FiveBoardDocument> {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly messages: MessageService,
  ) {}

  /**
   * Called by VS Code when the file needs to be loaded into memory.
   * We simply delegate to FiveBoardDocument.load — same as the normal editor.
   */
  async openCustomDocument(
    uri: vscode.Uri,
    _openContext: vscode.CustomDocumentOpenContext,
    _token: vscode.CancellationToken,
  ): Promise<FiveBoardDocument> {
    return FiveBoardDocument.load(uri);
  }

  /**
   * Called by VS Code when a new webview panel is created for this document.
   * Sets up the webview options, registers it with the MessageService and
   * loads the Projector HTML.
   */
  async resolveCustomEditor(
    document: FiveBoardDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    // Allow the webview to load scripts and local resources (same as the editor)
    const assetCacheRoot = get5boardzAssetCacheRoot(this.context, document.uri);
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'media'),
        this.context.globalStorageUri,
        assetCacheRoot,
      ],
    };

    // Set the tab title so the user can tell it apart from the normal editor
    webviewPanel.title = `${t('extension.projector.title')}: ${path.basename(document.uri.fsPath)}`;

    // Register the webview with the MessageService so it receives the file content
    // when it sends the 'ready' message
    this.messages.registerEditor(webviewPanel, {
      content: JSON.stringify(document.boardPackage.document.content),
      fileName: document.uri.fsPath,
    });

    // Load the Projector HTML into the webview
    setProjectorWebviewHtml(this.context, webviewPanel.webview);
  }
}
