import vscode from 'vscode';
import { setWebviewHtml } from '../webview';

/**
 * Loads the pre-built Projector.html into the given webview.
 * Reuses the same setWebviewHtml helper as the editor.
 */
export function setProjectorWebviewHtml(
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
): void {
  setWebviewHtml(context, webview, 'Projector.html');
}
