// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "5board-vsc" is now active!');

  const disposable = vscode.commands.registerCommand('5board-vsc.helloWorld', () => {
    const panel = vscode.window.createWebviewPanel(
      'fiveBoardCustomPage',          // dein „Webseiten“-Typ
      '5Board – Custom Page',         // Tab-Titel
      vscode.ViewColumn.One,
      {
        enableScripts: true,          // JS in deiner „Website“ erlaubt
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'media')
        ]
      }
    );

    // Startseite laden, z.B. "index.html"
    updateStaticWebview(panel.webview, context, 'index.html');

    // Navigation aus der Webview entgegennehmen
    panel.webview.onDidReceiveMessage(
      message => {
        if (message.command === 'navigate' && typeof message.page === 'string') {
          // z.B. page = "seite2.html"
          updateStaticWebview(panel.webview, context, message.page);
        }
      },
      undefined,
      context.subscriptions
    );
  });

  context.subscriptions.push(disposable);

  //
  // 2) Custom Editor Provider: automatisch für *.5board
  //
  const provider: vscode.CustomReadonlyEditorProvider = {
    async openCustomDocument(
      uri: vscode.Uri,
      _openContext: vscode.CustomDocumentOpenContext,
      _token: vscode.CancellationToken
    ): Promise<vscode.CustomDocument> {
      return {
        uri,
        dispose: () => {
          /* nothing */
        }
      };
    },

    async resolveCustomEditor(
      document: vscode.CustomDocument,
      webviewPanel: vscode.WebviewPanel,
      _token: vscode.CancellationToken
    ): Promise<void> {
      webviewPanel.webview.options = {
        enableScripts: true,          // JS in „Website“ erlaubt
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'media')
        ]
      };

      webviewPanel.title = `5Board: ${vscode.workspace.asRelativePath(document.uri, false)}`;

      // JSON‑Inhalt der .5board Datei einlesen
      let fileContent: string | undefined;
      try {
        fileContent = fs.readFileSync(document.uri.fsPath, 'utf8');
      } catch {
        fileContent = undefined;
      }

      webviewPanel.webview.html = getEditorWebviewHtml(webviewPanel.webview, context, fileContent);
    }
  };

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      '5board-vsc.editor', // muss zu viewType im package.json passen
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    )
  );
}

//
// HTML für den Custom Editor (zeigt .5board-Inhalt als JSON-Text an)
//
function getEditorWebviewHtml(
  webview: vscode.Webview,
  context: vscode.ExtensionContext,
  fileContent?: string
): string {
  const escapedJson = fileContent
    ? fileContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    : 'Keine Daten geladen';

  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'webview', 'main.js')
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'webview', 'styles.css')
  );

  console.log("Custom Editor wird geladen...");
  return `<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <title>5Board Test Editor</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="${styleUri}">
  </head>
  <body>
    <h1>5Board Webview Test Editor</h1>
    <p>Dies ist ein Testeditor, der den Inhalt der Datei anzeigt. Erkennt die 5Board Datei als JSON.</p>
    <pre id="content">${escapedJson}</pre>
    <script src="${scriptUri}"></script>
  </body>
</html>`;
}

//
// HTML-Datei aus /media/webview laden und in die "alte" Webview setzen
// pageName ist z.B. "index.html", "seite2.html" ...
//
function updateStaticWebview(
  webview: vscode.Webview,
  context: vscode.ExtensionContext,
  pageName: string
) {
  const pageOnDisk = vscode.Uri.joinPath(context.extensionUri, 'media', 'webview', pageName);

  let html: string;

  html = fs.readFileSync(pageOnDisk.fsPath, 'utf8');


  // Ressourcenpfade (CSS/JS/Bilder) anpassen, wenn du welche nutzt
  const mediaRoot = vscode.Uri.joinPath(context.extensionUri, 'media', 'webview');
  const mediaRootWeb = webview.asWebviewUri(mediaRoot).toString();

  // Beispiel: ersetze src="/media/webview/..." o.ä., falls du so referenzierst
  // (anpassen je nach deinen Pfad-Konventionen)
  html = html.replace(/(src|href)="([^"]+)"/g, `$1="${mediaRootWeb}/$2"`);

  console.log(html);

  webview.html = html;
  console.log("Webview aktualisiert");
}

export function deactivate() {}
