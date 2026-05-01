import vscode from 'vscode';
import fs from 'fs';

export function setWebviewHtml(context: vscode.ExtensionContext, webview: vscode.Webview): void {
  const filePath = vscode.Uri.joinPath(context.extensionUri, 'media', 'webview', 'Editor.html');

  const filecontent = fs.readFileSync(filePath.fsPath, 'utf8');

  const mediaRoot = vscode.Uri.joinPath(context.extensionUri, 'media', 'webview');
  const mediaRootWeb = webview.asWebviewUri(mediaRoot).toString();

  const html = filecontent.replace(/(src|href)="(.+?)"/g, `$1="${mediaRootWeb}/$2"`);

  webview.html = html;
}
