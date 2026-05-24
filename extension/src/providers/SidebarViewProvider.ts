import * as vscode from 'vscode';
import { setWebviewHtml } from '../webview';
import { MessageService } from '../MessageService';

export class SidebarViewProvider implements vscode.WebviewViewProvider {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly messages: MessageService,
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

    this.messages.register(webviewView);
  }
}
