import * as vscode from 'vscode';

import { BoardCustomDocument } from '../board/BoardCustomDocument';
import { BoardPackage } from '../board/package';
import { get5boardzAssetCacheRoot } from '../board/webview';
import { t } from '../localization';
import { setWebviewHtml } from '../webview';
import { EXTENSION } from '../extension';

/**
 * Read-only editor provider for the projector/beamer view.
 *
 * Uses CustomReadonlyEditorProvider (via registerCustomEditorProvider) because
 * the projector never modifies the document — it only displays it.
 *
 * retainContextWhenHidden keeps the webview alive when the tab loses focus so the
 * projector does not reload every time the teacher switches back to the editor.
 */
export class ProjectorProvider implements vscode.CustomReadonlyEditorProvider<BoardCustomDocument> {
  /** Must match the viewType declared in package.json under "customEditors". */
  public static readonly VIEW_TYPE = '5board-vsc.projector';

  constructor(private readonly context: vscode.ExtensionContext) {}

  /** Register this provider with VS Code so it can be activated. */
  public register(): void {
    // registerCustomEditorProvider accepts CustomReadonlyEditorProvider — no separate function exists.
    this.context.subscriptions.push(
      vscode.window.registerCustomEditorProvider(ProjectorProvider.VIEW_TYPE, this, {
        webviewOptions: { retainContextWhenHidden: true },
      }),
    );
  }

  /**
   * Called by VS Code when the file needs to be loaded into memory.
   *
   * Falls back to DUMMY_BOARD_DOCUMENT when the .5boardz file has no elements yet,
   * so the projector shows something useful during development.
   * Remove the fallback block once the editor can write real content.
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
   * Sets up the webview options, registers the panel with the document's
   * MessageService (so it receives init/updateDocument messages), and loads
   * the Projector HTML.
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

    const updateTitle = () => {
      webviewPanel.title = `${t('extension.projector.title')}: ${document.boardPackage.document.manifest.title}`;
    };

    updateTitle();
    document.onDocumentChange(() => updateTitle());

    // If the file is already open in an editor, register the projector panel in
    // that document's MessageService. This ensures cursorMove and scroll events
    // forwarded by the editor are also received by the projector.
    // Fall back to the projector's own service when no editor is open (standalone use).
    const editorDocument = EXTENSION.getDocumentForUri(document.uri);
    const targetService = editorDocument?.messageService ?? document.messageService;
    targetService.registerPanel(webviewPanel);

    // Lifecycle: count this projector window (init) until it closes (destroy)
    const owner = editorDocument ?? document;
    owner.addProjector();
    webviewPanel.onDidDispose(() => owner.removeProjector());

    setWebviewHtml(this.context, webviewPanel.webview, 'Projector.html');
  }
}
