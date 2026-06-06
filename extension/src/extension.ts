// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import path from 'path';
import vscode from 'vscode';
import { FiveBoardEditorProvider } from './board/editorProvider';
import { FiveBoardExportPreviewProvider } from './board/exportPreviewProvider';
import { EDITOR_VIEW_TYPE, EXPORT_PREVIEW_VIEW_TYPE } from './board/webview';
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

  // >HTML Export Preview
  context.subscriptions.push(
    vscode.commands.registerCommand(
      '5board-vsc.previewHtmlExport',
      async (resource?: vscode.Uri) => {
        await previewHtmlExportCommand(resource);
      },
    ),
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

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      EXPORT_PREVIEW_VIEW_TYPE,
      new FiveBoardExportPreviewProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true,
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

// Opens the export preview beside the current .5boardz editor.
async function previewHtmlExportCommand(resource?: vscode.Uri): Promise<void> {
  const uri = getActiveBoardPackageUri(resource);

  if (!uri) {
    vscode.window.showErrorMessage('Open a .5boardz file before starting the HTML export preview.');
    return;
  }

  await vscode.commands.executeCommand(
    'vscode.openWith',
    uri,
    EXPORT_PREVIEW_VIEW_TYPE,
    vscode.ViewColumn.Beside,
  );
}

// Finds a .5boardz URI from the command resource or active editor.
function getActiveBoardPackageUri(resource?: vscode.Uri): vscode.Uri | undefined {
  if (isBoardPackageUri(resource)) {
    return resource;
  }

  const activeTabUri = getUriFromTabInput(vscode.window.tabGroups.activeTabGroup.activeTab?.input);
  if (isBoardPackageUri(activeTabUri)) {
    return activeTabUri;
  }

  const activeTextEditorUri = vscode.window.activeTextEditor?.document.uri;
  if (isBoardPackageUri(activeTextEditorUri)) {
    return activeTextEditorUri;
  }

  return undefined;
}

// Extracts a URI from VS Code tab input objects.
function getUriFromTabInput(input: unknown): vscode.Uri | undefined {
  if (!isRecord(input)) {
    return undefined;
  }

  const uri = input.uri;
  return uri instanceof vscode.Uri ? uri : undefined;
}

// Checks whether a URI points to a .5boardz package.
function isBoardPackageUri(uri: vscode.Uri | undefined): uri is vscode.Uri {
  return uri?.fsPath.toLowerCase().endsWith('.5boardz') === true;
}

// Checks whether an unknown value can be inspected like an object.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
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
