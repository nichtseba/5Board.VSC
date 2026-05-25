import vscode from 'vscode';
import { setWebviewHtml } from '../webview';

// The view type must match the one registered in package.json under "customEditors"
export const PROJECTOR_VIEW_TYPE = '5board-vsc.projector';

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
