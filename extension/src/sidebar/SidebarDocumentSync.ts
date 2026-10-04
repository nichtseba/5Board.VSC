import vscode from 'vscode';
import { EXTENSION } from '../extension';
import { MessageService } from '../MessageService';

export class SidebarDocumentSync implements vscode.Disposable {
  private activeDocumentListener?: vscode.Disposable;
  private documentListener?: vscode.Disposable;
  private editorStateListener?: vscode.Disposable;

  constructor(private readonly messages: MessageService) {
    messages.on('ready', (_msg, sender) => {
      messages.send(
        {
          type: 'updateEditorState',
          editorState: EXTENSION.editorState,
        },
        sender,
      );
      const activeDocument = EXTENSION.activeEditorDocument;
      if (!activeDocument) return;
      messages.send(
        {
          type: 'initSidebar',
          document: activeDocument.boardPackage.document,
          editorState: EXTENSION.editorState,
        },
        sender,
      );
    });

    this.documentListener = EXTENSION.onActiveDocumentChange((doc) => {
      if (!doc) {
        return;
      }

      this.messages.send({
        type: 'updateDocument',
        document: doc.boardPackage.document,
      });

      this.activeDocumentListener?.dispose();
      this.activeDocumentListener = doc.onDocumentChange((document) => {
        this.messages.send({
          type: 'updateDocument',
          document,
        });
      });
    });
    this.editorStateListener = EXTENSION.onEditorStateChange((state) => {
      this.messages.send({
        type: 'updateEditorState',
        editorState: state,
      });
    });
  }

  dispose(): void {
    this.activeDocumentListener?.dispose();
    this.documentListener?.dispose();
    this.editorStateListener?.dispose();
  }
}
