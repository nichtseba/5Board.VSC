import * as vscode from 'vscode';
import {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
  isJsonObject,
} from '5board.vsc-common';
import { write5boardzPackage } from './boardPackage';
import {
  FIVEBOARD_EDITOR_VIEW_TYPE,
  load5boardDocument,
  reload5boardDocument,
  save5boardDocument,
  saveOld5boardAs5boardzPackage,
} from './boardDocument';
import type { FiveBoardDocument } from './boardDocument';
import {
  get5boardzAssetCacheRoot,
  render5boardzPackageHtml,
  SAVE_OLD_5BOARD_AS_5BOARDZ_MESSAGE,
} from './boardPackageWebview';
import { checkCodeblockTools, runCodeblock } from './runner';

export function create5boardEditorProvider(
  context: vscode.ExtensionContext,
): vscode.CustomEditorProvider<FiveBoardDocument> {
  // This provider encapsulates the complete custom editor lifecycle for .5board/.5boardz
  const changeEmitter = new vscode.EventEmitter<
    vscode.CustomDocumentContentChangeEvent<FiveBoardDocument>
  >();

  return {
    onDidChangeCustomDocument: changeEmitter.event,

    async openCustomDocument(
      uri: vscode.Uri,
      _openContext: vscode.CustomDocumentOpenContext,
      _token: vscode.CancellationToken,
    ): Promise<FiveBoardDocument> {
      return load5boardDocument(uri);
    },

    async resolveCustomEditor(
      document: FiveBoardDocument,
      webviewPanel: vscode.WebviewPanel,
      _token: vscode.CancellationToken,
    ): Promise<void> {
      const assetCacheRoot = get5boardzAssetCacheRoot(context, document.uri);

      webviewPanel.webview.options = {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'media'),
          context.globalStorageUri,
          assetCacheRoot,
        ],
      };

      webviewPanel.title = `5Board: ${vscode.workspace.asRelativePath(document.uri, false)}`;
      webviewPanel.webview.onDidReceiveMessage(async (message: unknown) => {
        try {
          if (!isJsonObject(message)) return;

          if (message.type === SAVE_OLD_5BOARD_AS_5BOARDZ_MESSAGE) {
            const targetUri = await saveOld5boardAs5boardzPackage(document);
            await vscode.commands.executeCommand(
              'vscode.openWith',
              targetUri,
              FIVEBOARD_EDITOR_VIEW_TYPE,
            );
            return;
          }

          const msg = message as unknown as WebviewToExtensionMessage;

          if (msg.type === 'runCodeblock') {
            const result = await runCodeblock(msg.payload);
            webviewPanel.webview.postMessage({
              type: 'codeblockResult',
              payload: result,
            } as ExtensionToWebviewMessage);
            return;
          }

          if (msg.type === 'checkCodeblockTools') {
            const result = await checkCodeblockTools(msg.payload.language);
            webviewPanel.webview.postMessage({
              type: 'codeblockToolCheckResult',
              payload: result,
            } as ExtensionToWebviewMessage);
            return;
          }
        } catch (error) {
          vscode.window.showErrorMessage(
            `5boardz Datei konnte nicht gespeichert werden: ${errorMessage(error)}`,
          );
        }
      });

      webviewPanel.webview.html = await render5boardzPackageHtml(
        webviewPanel.webview,
        document,
        assetCacheRoot,
      );
    },

    async saveCustomDocument(
      document: FiveBoardDocument,
      _cancellation: vscode.CancellationToken,
    ): Promise<void> {
      await save5boardDocument(document, document.uri);
    },

    async saveCustomDocumentAs(
      document: FiveBoardDocument,
      destination: vscode.Uri,
      _cancellation: vscode.CancellationToken,
    ): Promise<void> {
      await save5boardDocument(document, destination);
    },

    async revertCustomDocument(
      document: FiveBoardDocument,
      _cancellation: vscode.CancellationToken,
    ): Promise<void> {
      await reload5boardDocument(document);
    },

    async backupCustomDocument(
      document: FiveBoardDocument,
      backupContext: vscode.CustomDocumentBackupContext,
      _cancellation: vscode.CancellationToken,
    ): Promise<vscode.CustomDocumentBackup> {
      await write5boardzPackage(backupContext.destination, document.fiveBoardz);

      return {
        id: backupContext.destination.toString(),
        delete: async () => {
          await vscode.workspace.fs.delete(backupContext.destination, { recursive: false });
        },
      };
    },
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
