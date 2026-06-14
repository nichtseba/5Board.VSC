import vscode from 'vscode';
import { EXTENSION } from './extension';
import { MessageService } from './MessageService';

export class SidebarDocumentSync implements vscode.Disposable {
  private listener?: vscode.Disposable;
  private activeDocSubscription?: vscode.Disposable;

  constructor(private readonly messages: MessageService) {
    messages.on('ready', (_msg, sender) => {
      const activeDocument = EXTENSION.activeEditorDocument;
      if (!activeDocument) return;
      messages.send(
        {
          type: 'initSidebar',
          document: activeDocument.boardPackage.document,
        },
        sender,
      );
    });

    this.activeDocSubscription = EXTENSION.onActiveDocumentChange((doc) => {
      this.listener?.dispose();

      if (!doc) {
        return;
      }

      this.messages.send({
        type: 'updateDocument',
        document: doc.boardPackage.document,
      });

      this.listener = doc.onDocumentChange((document) => {
        this.messages.send({
          type: 'updateDocument',
          document,
        });
      });
    });
  }

  dispose(): void {
    this.listener?.dispose();
    this.activeDocSubscription?.dispose();
  }
}
