import * as vscode from 'vscode';
import { setWebviewHtml } from '../webview';
import { MessageService } from '../MessageService';

export abstract class WebviewProvider implements vscode.WebviewViewProvider {
  protected constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly messages: MessageService,
    private readonly htmlFileName: string,
    private readonly viewId: string,
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

    // Connect this sidebar to the shared message service so it can talk to the
    // extension (e.g. send the selected tool to the active editor).
    this.messages.registerPanel(webviewView);

    setWebviewHtml(this.context, webviewView.webview, this.htmlFileName);
  }

  public register(): void {
    this.context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(this.viewId, this, {
        webviewOptions: { retainContextWhenHidden: true },
      }),
    );
  }
}
export class SidebarViewProvider extends WebviewProvider {
  public static readonly VIEW_ID = '5board-vsc.sidebar-tool-view';
  constructor(context: vscode.ExtensionContext, messages: MessageService) {
    super(context, messages, 'ToolSidebar.html', SidebarViewProvider.VIEW_ID);
  }
}
export class ProjectorSettingsSidebarViewProvider extends WebviewProvider {
  public static readonly VIEW_ID = '5board-vsc.sidebar-projector-view';
  constructor(context: vscode.ExtensionContext, messages: MessageService) {
    super(
      context,
      messages,
      'ProjectorSettingsSidebar.html',
      ProjectorSettingsSidebarViewProvider.VIEW_ID,
    );
  }
}
export class ElementSettingsSidebarViewProvider extends WebviewProvider {
  public static readonly VIEW_ID = '5board-vsc.sidebar-element-settings-view';
  constructor(context: vscode.ExtensionContext, messages: MessageService) {
    super(
      context,
      messages,
      'ElementSettingsSidebar.html',
      ElementSettingsSidebarViewProvider.VIEW_ID,
    );
  }
}
