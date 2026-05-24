// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import path from 'path';
import vscode from 'vscode';
import { FiveBoardEditorProvider } from './board/editorProvider';
import { EDITOR_VIEW_TYPE } from './board/webview';
import { BoardPackage } from './board/package';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    // >5Board: Neue .5boardz Datei erstellen
    vscode.commands.registerCommand('5board-vsc.newBoard', async () => {
      await new5boardCommand();
    }),
  );

  // Custom Editor Provider for *.5boardz files
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      EDITOR_VIEW_TYPE,
      new FiveBoardEditorProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true, // Todo: store context
        },
      },
    ),
  );
}

async function new5boardCommand(): Promise<void> {
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
    // Todo: Maybe this should create an unsaved file
    const title = path.basename(targetUri.fsPath, path.extname(targetUri.fsPath));
    await BoardPackage.createEmpty(title).write(targetUri);
    await vscode.commands.executeCommand('vscode.openWith', targetUri, EDITOR_VIEW_TYPE);
  } catch (error) {
    vscode.window.showErrorMessage(
      `5boardz Datei konnte nicht erstellt werden: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function deactivate() {}
