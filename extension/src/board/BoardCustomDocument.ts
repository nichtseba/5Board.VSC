import vscode from 'vscode';
import { BoardPackage } from './package';
import { BoardDocument } from '5board.vsc-common';
import { MessageService } from '../MessageService';
import { EXTENSION } from '../extension';

export class BoardCustomDocument implements vscode.CustomDocument {
  public readonly documentChange = new vscode.EventEmitter<BoardDocument>();
  public readonly onDocumentChange = this.documentChange.event;
  public readonly messageService = new MessageService();

  constructor(
    public boardPackage: BoardPackage,
    public uri: vscode.Uri,
  ) {
    this.messageService.on('ready', (_msg, sender) => {
      this.messageService.send(
        { type: 'init', document: this.boardPackage.document, language: 'en' },
        sender,
      );
    });
    this.messageService.on('focus', () => {
      EXTENSION.setActiveEditorDocument(this);
    });
    this.onDocumentChange((document) => {
      this.messageService.send({ type: 'updateDocument', document });
    });
  }

  dispose(): void {
    EXTENSION.clearActiveEditorDocument(this);
  }

  public async reloadDocument(): Promise<void> {
    if (!this.uri) {
      throw new Error('Cannot reload document without URI');
    }
    this.boardPackage = await BoardPackage.read(this.uri);
  }

  public async saveDocument(targetUri?: vscode.Uri): Promise<void> {
    await this.boardPackage.write(targetUri ?? this.uri);
  }

  public applyEdit(edit: (document: BoardDocument) => void): void {
    edit(this.boardPackage.document);
    this.documentChange.fire(this.boardPackage.document);
  }
}
