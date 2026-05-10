import * as vscode from 'vscode';
import { setWebviewHtml } from '../webview';

export class SidebarViewProvider implements vscode.WebviewViewProvider {
  constructor(
    private readonly context: vscode.ExtensionContext,
    //private readonly messages: MessageService, // Todo: Add when passing messages to the webview
    private readonly htmlFile: string,
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')],
    };

    setWebviewHtml(this.context, webviewView.webview, this.htmlFile);

    // this.messages.register(webviewView); // Todo: Add when passing messages to the webview
  }
}
