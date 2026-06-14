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
        {
          type: 'init',
          document: this.boardPackage.document,
          editorState: EXTENSION.editorState,
          language: 'en',
        },
        sender,
      );
    });
    this.messageService.on('focus', () => {
      EXTENSION.activeEditorDocument = this;
    });

    this.messageService.on('selectElement', (msg) => {
      console.log('selectElement: ', msg.id);
      this.applyEdit((document) => {
        document.content.selectedElementId = msg.id;
      });
    });

    this.messageService.on('updateElementLayout', (msg) => {
      this.applyEdit((document) => {
        const element = document.content.elements.find((e) => e.id === msg.id);

        if (!element) {
          return;
        }

        element.layout = {
          ...element.layout,
          ...msg.changes,
        };
      });
    });
    this.messageService.on('insertSpacerRows', (msg) => {
      this.applyEdit((document) => {
        for (const element of document.content.elements) {
          if (element.layout.yPos >= msg.startRow) {
            element.layout = {
              ...element.layout,
              yPos: element.layout.yPos + msg.rowCount,
            };
          }
        }
      });
    });
    this.onDocumentChange((document) => {
      this.messageService.send({ type: 'updateDocument', document });
    });
    EXTENSION.onEditorStateChange((state) => {
      this.messageService.send({
        type: 'updateEditorState',
        editorState: state,
      });
    });
  }

  dispose(): void {
    EXTENSION.activeEditorDocument = null;
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
