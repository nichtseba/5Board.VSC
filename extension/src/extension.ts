// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import { setWebviewHtml } from './webview';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "5board-vsc" is now active!');

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
      // This should stay here as an example it will be removed later
      /* eslint-disable @typescript-eslint/no-unused-vars */
      let fileContent: string | undefined;
      try {
        fileContent = fs.readFileSync(document.uri.fsPath, 'utf8');
      } catch {
        fileContent = undefined;
      }
      /* eslint-enable @typescript-eslint/no-unused-vars */
      setWebviewHtml(context, webviewPanel.webview, 'Editor.html');
    },
  };

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      '5board-vsc.editor', // muss zu viewType im package.json passen
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      },
    ),
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
    },
  };

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      '5boardSidebarView', // same id as view in package.json
      sidebarProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      },
    ),
  );
}

//
// HTML-Datei aus /media/webview laden und in die "alte" Webview setzen
// pageName ist z.B. "index.html", "seite2.html" ...
//
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- wird später gebraucht
function updateStaticWebview(
  webview: vscode.Webview,
  context: vscode.ExtensionContext,
  pageName: string,
) {
  const pageOnDisk = vscode.Uri.joinPath(context.extensionUri, 'media', 'webview', pageName);

  let html: string;

  html = fs.readFileSync(pageOnDisk.fsPath, 'utf8');

  // Ressourcenpfade (CSS/JS/Bilder) anpassen, wenn du welche nutzt
  const mediaRoot = vscode.Uri.joinPath(context.extensionUri, 'media', 'webview');
  const mediaRootWeb = webview.asWebviewUri(mediaRoot).toString();

  // Beispiel: ersetze src="/media/webview/..." o.ä., falls du so referenzierst
  // (anpassen je nach deinen Pfad-Konventionen)
  // This is really bad
  html = html.replace(/src="\.\/(.*?)"/g, `src="${mediaRootWeb}/$1"`);
  html = html.replace(/href="\.\/(.*?)"/g, `href="${mediaRootWeb}/$1"`);

  webview.html = html;
  console.log('Webview aktualisiert');
}

export function deactivate() {}
