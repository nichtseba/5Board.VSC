import * as vscode from 'vscode';
import { write5boardzPackage } from './boardPackage';
import { load5boardDocument, reload5boardDocument, save5boardDocument } from './boardDocument';
import type { FiveBoardDocument } from './boardDocument';
import type { MessageService } from './MessageService';
import { setWebviewHtml } from './webview';

export function create5boardEditorProvider(
  context: vscode.ExtensionContext,
  messages: MessageService,
): vscode.CustomEditorProvider<FiveBoardDocument> {
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
      webviewPanel.webview.options = {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
      };

      webviewPanel.title = `5Board: ${vscode.workspace.asRelativePath(document.uri, false)}`;

      // registerEditor sends 'fileLoaded' automatically when the webview posts 'ready',
      // so the React editor receives the board content right after it boots.
      messages.registerEditor(webviewPanel, {
        content: JSON.stringify(document.fiveBoardz.content),
        fileName: document.uri.fsPath,
      });

      setWebviewHtml(context, webviewPanel.webview, 'Editor.html');
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
