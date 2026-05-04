import * as vscode from 'vscode';
import * as fs from 'fs';
import { setWebviewHtml } from './webview';
import { MessageService } from './MessageService';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "5board-vsc" is now active!');

  const messages = new MessageService();

  // Status Bar: shows live counter, click = increment
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.command = '5board-vsc.incrementFromToolbar';
  statusBar.tooltip = 'Click to increment counter';
  statusBar.text = `$(symbol-numeric) Counter: 0`;
  statusBar.show();

  messages.setOnStateChange((state) => {
    statusBar.text = `$(symbol-numeric) Counter: ${state.counter}`;
  });

  context.subscriptions.push(statusBar);

  // Toolbar: increment counter from outside the webview
  context.subscriptions.push(
    vscode.commands.registerCommand('5board-vsc.incrementFromToolbar', () => {
      messages.dispatch({ type: 'counterIncrement' });
    }),
  );

  const disposable = vscode.commands.registerCommand('5board-vsc.helloWorld', () => {
    const panel = vscode.window.createWebviewPanel(
      '5board.vsc-webview', // dein „Webseiten“-Typ
      '5Board – Custom Page', // Tab-Titel
      vscode.ViewColumn.One,
      {
        enableScripts: true, // JS in deiner „Website“ erlaubt
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
      },
    );
    setWebviewHtml(context, panel.webview, 'Editor.html');
  });

  context.subscriptions.push(disposable);

  //
  // Custom Editor Provider: automatisch für *.5board
  //
  const provider: vscode.CustomReadonlyEditorProvider = {
    async openCustomDocument(
      uri: vscode.Uri,
      _openContext: vscode.CustomDocumentOpenContext,
      _token: vscode.CancellationToken,
    ): Promise<vscode.CustomDocument> {
      return {
        uri,
        dispose: () => {
          /* nothing */
        },
      };
    },

    async resolveCustomEditor(
      document: vscode.CustomDocument,
      webviewPanel: vscode.WebviewPanel,
      _token: vscode.CancellationToken,
    ): Promise<void> {
      webviewPanel.webview.options = {
        enableScripts: true, // JS allowed
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
      };

      webviewPanel.title = `5Board: ${vscode.workspace.asRelativePath(document.uri, false)}`;

      // Get JSON‑Content from .5board file
      let fileContent: string | undefined;
      try {
        fileContent = fs.readFileSync(document.uri.fsPath, 'utf8');
      } catch {
        fileContent = undefined;
      }

      setWebviewHtml(context, webviewPanel.webview, 'Editor.html');
      messages.registerEditor(webviewPanel, {
        content: fileContent ?? '',
        fileName: vscode.workspace.asRelativePath(document.uri, false),
      });
    },
  };

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider('5board-vsc.editor', provider, {
      webviewOptions: { retainContextWhenHidden: true },
      supportsMultipleEditorsPerDocument: true,
    }),
  );

  //
  // Custom Sidebar Provider: only for *.5board
  //
  const sidebarProvider: vscode.WebviewViewProvider = {
    resolveWebviewView(
      webviewView: vscode.WebviewView,
      _context: vscode.WebviewViewResolveContext,
      _token: vscode.CancellationToken,
    ) {
      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
      };

      setWebviewHtml(context, webviewView.webview, 'Sidebar.html');
      messages.register(webviewView);
    },
  };

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('5boardSidebarView', sidebarProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );
}

export function deactivate() {}
