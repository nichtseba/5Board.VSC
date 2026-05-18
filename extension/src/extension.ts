// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { createEmpty5boardzPackage, write5boardzPackage } from './boardPackage';
import { create5boardEditorProvider } from './boardEditorProvider';
import { FIVEBOARD_EDITOR_VIEW_TYPE, is5boardzUri, isOld5boardUri } from './boardDocument';
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

  context.subscriptions.push(
    // >5Board: Datei öffnen
    vscode.commands.registerCommand('5board-vsc.openBoardFile', async (uri?: vscode.Uri) => {
      await open5boardFileCommand(uri);
    }),
    // >5Board: Neue .5boardz Datei erstellen
    vscode.commands.registerCommand('5board-vsc.newBoard', async () => {
      await new5boardzFileCommand();
    }),
  );

  // Custom Editor Provider for *.5board and *.5boardz files
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      FIVEBOARD_EDITOR_VIEW_TYPE, // needs to match viewType from boardDocument.ts
      create5boardEditorProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      },
    ),
  );
}

async function open5boardFileCommand(uri?: vscode.Uri): Promise<void> {
  try {
    const sourceUri = await resolve5boardFileUri(uri);
    if (!sourceUri) {
      return;
    }

    if (isOld5boardUri(sourceUri) || is5boardzUri(sourceUri)) {
      await vscode.commands.executeCommand(
        'vscode.openWith',
        sourceUri,
        FIVEBOARD_EDITOR_VIEW_TYPE,
      );
      return;
    }

    throw new Error('Es können nur .5board und .5boardz Dateien geöffnet werden.');
  } catch (error) {
    vscode.window.showErrorMessage(
      `5board Datei konnte nicht geöffnet werden: ${errorMessage(error)}`,
    );
  }
}

async function new5boardzFileCommand(): Promise<void> {
  try {
    const defaultUri = vscode.workspace.workspaceFolders?.[0]
      ? vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, 'Vorlesung.5boardz')
      : undefined;
    const targetUri = await vscode.window.showSaveDialog({
      defaultUri,
      filters: {
        '5Boardz package': ['5boardz'],
      },
      saveLabel: '5boardz Datei erstellen',
    });

    if (!targetUri) {
      return;
    }

    const title = path.basename(targetUri.fsPath, path.extname(targetUri.fsPath));
    await write5boardzPackage(targetUri, createEmpty5boardzPackage(title));
    await vscode.commands.executeCommand('vscode.openWith', targetUri, FIVEBOARD_EDITOR_VIEW_TYPE);
  } catch (error) {
    vscode.window.showErrorMessage(
      `5boardz Datei konnte nicht erstellt werden: ${errorMessage(error)}`,
    );
  }
}

// Opens a file dialog to select a .5board/.5boardsz file if no URI is provided
async function resolve5boardFileUri(uri?: vscode.Uri): Promise<vscode.Uri | undefined> {
  if (uri && (isOld5boardUri(uri) || is5boardzUri(uri))) {
    return uri;
  }

  const activeUri = vscode.window.activeTextEditor?.document.uri;
  if (activeUri && (isOld5boardUri(activeUri) || is5boardzUri(activeUri))) {
    return activeUri;
  }

  const selectedFiles = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    filters: {
      '5Board files': ['5board', '5boardz'],
    },
    openLabel: '5Board-Datei öffnen',
  });

  return selectedFiles?.[0];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function createLegacyReadonlyEditorProvider(
  context: vscode.ExtensionContext,
): vscode.CustomReadonlyEditorProvider {
  return {
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
}

//
// HTML für den Custom Editor (zeigt .5board-Inhalt als JSON-Text an)
//
function getEditorWebviewHtml(
  webview: vscode.Webview,
  context: vscode.ExtensionContext,
  fileContent?: string,
): string {
  const escapedJson = fileContent
    ? fileContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    : 'Keine Daten geladen';

  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'webview', 'main.js'),
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'webview', 'styles.css'),
  );

  console.log('Custom Editor wird geladen...');
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
