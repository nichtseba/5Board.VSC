// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import path from 'path';
import vscode from 'vscode';
import { FiveBoardEditorProvider } from './board/editorProvider';
import { EDITOR_VIEW_TYPE } from './board/webview';
import { BoardPackage } from './board/package';
import { t } from './localization';
import { MessageService } from './MessageService';
import { setWebviewHtml } from './webview';
import { SidebarViewProvider } from './providers/SidebarViewProvider';
import { StructureTreeProvider } from './providers/StructureTreeProvider';

export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "5board-vsc" is now active!');

  // Todo: nicht hier sondern vor activate()
  // Todo: sidebar drinlassen aber toolbar weg (selected-element)
  const messages = new MessageService();

  const disposable = vscode.commands.registerCommand('5board-vsc.openCustomEditor', () => {
    const panel = vscode.window.createWebviewPanel(
      '5board.vsc-webview', // dein „Webseiten“-Typ
      t('extension.openCustomEditorCommand.title'), // Tab-Titel
      vscode.ViewColumn.One,
      {
        enableScripts: true, // JS in deiner „Website“ erlaubt
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
      },
    );
    setWebviewHtml(context, panel.webview, 'Editor.html');
    messages.register(panel);
  });

  context.subscriptions.push(disposable);

  context.subscriptions.push(
    vscode.commands.registerCommand('5board-vsc.startPresentation', () => {
      vscode.window.showInformationMessage('Presentation started');
    }),
  );

  // >5Board: Neue .5boardz Datei erstellen
  context.subscriptions.push(
    vscode.commands.registerCommand('5board-vsc.newBoard', async () => {
      await new5boardCommand();
    }),
  );

  // >HTML Test Export-Command
  context.subscriptions.push(
    vscode.commands.registerCommand('5board-vsc.exportHtmlTest', () => {
      messages.requestHtmlExport();
    }),
  );

  // Custom Editor Provider for *.5boardz files
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      EDITOR_VIEW_TYPE,
      new FiveBoardEditorProvider(context, messages),
      {
        webviewOptions: {
          retainContextWhenHidden: true, // Todo: store context
        },
      },
    ),
  );

  // Sidebar Editor Controls
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      '5board-vsc.sidebar-view',
      new SidebarViewProvider(context, messages, 'Sidebar.html'),
      {
        webviewOptions: { retainContextWhenHidden: true },
      },
    ),
  );
  // Sidebar Element Settings
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      '5board-vsc.sidebar-element-settings-view',
      new SidebarViewProvider(context, messages, 'ElementSettingsSidebar.html'),
      {
        webviewOptions: { retainContextWhenHidden: true },
      },
    ),
  );
  // Sidebar Treeview (not a webview)
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      '5board-vsc.sidebar-structure-view',
      new StructureTreeProvider(),
    ),
  );
}

async function new5boardCommand(): Promise<void> {
  try {
    const defaultUri = vscode.workspace.workspaceFolders?.[0]
      ? vscode.Uri.joinPath(
          vscode.workspace.workspaceFolders[0].uri,
          `${t('extension.new5boardCommand.defaultFileName')}.5boardz`,
        )
      : undefined;
    const targetUri = await vscode.window.showSaveDialog({
      defaultUri,
      filters: {
        [t('extension.new5boardCommand.packageFilter')]: ['5boardz'],
      },
      saveLabel: t('extension.new5boardCommand.createFile'),
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
      `${t('extension.new5boardCommand.createFileFailed')} ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function deactivate() {}
