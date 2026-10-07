import * as vscode from 'vscode';
import { convertLegacyBoardFile } from '../board/legacyImport';
import { t } from '../localization';

/**
 * Opening an old .5board file converts it into a .5boardz file and opens that in the editor.
 * The converter tab itself only shows a short message and closes once the conversion is done.
 */
export class LegacyConverterProvider implements vscode.CustomReadonlyEditorProvider {
  /** Must match the viewType declared in package.json under "customEditors". */
  public static readonly VIEW_TYPE = '5board-vsc.legacy-converter';

  constructor(private readonly context: vscode.ExtensionContext) {}

  public register(): void {
    this.context.subscriptions.push(
      vscode.window.registerCustomEditorProvider(LegacyConverterProvider.VIEW_TYPE, this),
    );
  }

  openCustomDocument(uri: vscode.Uri): vscode.CustomDocument {
    return { uri, dispose: () => undefined };
  }

  async resolveCustomEditor(
    document: vscode.CustomDocument,
    webviewPanel: vscode.WebviewPanel,
  ): Promise<void> {
    webviewPanel.webview.html = `<!doctype html><p>${escapeHtml(t('extension.legacyImport.converting'))}</p>`;
    await convertLegacyBoardFile(document.uri);
    webviewPanel.dispose();
  }
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`);
}
