import crypto from 'crypto';
import vscode from 'vscode';
import { setWebviewHtml } from '../webview';

export const EDITOR_VIEW_TYPE = '5board-vsc.editor';

export function get5boardzAssetCacheRoot(
  context: vscode.ExtensionContext,
  packageUri: vscode.Uri,
): vscode.Uri {
  // ZIP assets are mirrored into globalStorage so the webview gets safe VS Code URIs.
  const hash = crypto.createHash('sha256').update(packageUri.toString()).digest('hex').slice(0, 24);
  return vscode.Uri.joinPath(context.globalStorageUri, '5boardz-assets', hash);
}

export function setEditorWebviewHtml(
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
): void {
  setWebviewHtml(context, webview, 'Editor.html');
}
