import vscode from 'vscode';
import fs from 'fs';

/**
 * Loads a pre-built HTML file (e.g. from a React build) into the VS Code webview
 * and rewrites all local resource paths so they can be accessed inside the
 * webview sandbox.
 *
 * VS Code webviews cannot access the filesystem directly. Therefore, all
 * relative src/href paths (scripts, styles, assets) are converted to special
 * webview URIs via `webview.asWebviewUri(...)`.
 *
 * This function acts as the bridge between the extension (Node.js context)
 * and the frontend bundle (browser context).
 */
export function setWebviewHtml(
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
  webviewHtmlFileName: string,
): void {
  const filePath = vscode.Uri.joinPath(
    context.extensionUri,
    'media',
    'webview',
    webviewHtmlFileName,
  );

  const filecontent = fs.readFileSync(filePath.fsPath, 'utf8');

  const mediaRoot = vscode.Uri.joinPath(context.extensionUri, 'media', 'webview');
  const mediaRootWeb = webview.asWebviewUri(mediaRoot).toString();

  const html = filecontent
    .replace(/(src|href)="(.+?)"/g, `$1="${mediaRootWeb}/$2"`)
    .replace('__CSP_SOURCE__', webview.cspSource);

  webview.html = html;
}
