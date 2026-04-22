// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

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

    panel.webview.html = getWebviewHtml(panel.webview, context);
  });

  context.subscriptions.push(disposable);
}

function getWebviewHtml(webview: vscode.Webview, context: vscode.ExtensionContext): string {

  const htmlPath = vscode.Uri.joinPath(
    context.extensionUri,
    'media',
    'webview',
    'index.html'
  );

  let html = fs.readFileSync(htmlPath.fsPath, 'utf8');

  return html;
  
}

// This method is called when your extension is deactivated
export function deactivate() {}
