import vscode, { CustomDocumentEditEvent } from 'vscode';
import { BoardPackage } from './package';
import { BoardDocument } from '5board.vsc-common';
import { MessageService } from '../MessageService';
import { EXTENSION } from '../extension';
import { DocumentMessageHandlers } from './DocumentMessageHandlers';

export class BoardCustomDocument implements vscode.CustomDocument {
  public readonly documentChange = new vscode.EventEmitter<
    CustomDocumentEditEvent<BoardCustomDocument>
  >();
  public readonly onDocumentChange = this.documentChange.event;
  public readonly messageService = new MessageService();
  private readonly disposables: vscode.Disposable[] = [];
  private readonly unsubscribers: (() => void)[] = [];

  constructor(
    public boardPackage: BoardPackage,
    public uri: vscode.Uri,
  ) {
    this.disposables.push(
      this.onDocumentChange((e) => {
        this.messageService.send({
          type: 'updateDocument',
          document: e.document.boardPackage.document,
        });
      }),
    );
    this.disposables.push(
      EXTENSION.onEditorStateChange((state) => {
        this.messageService.send({
          type: 'updateEditorState',
          editorState: state,
        });
      }),
    );

    this.registerMessageHandlers();
  }

  private registerMessageHandlers(): void {
    this.unsubscribers.push(
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
      }),
    );
    this.unsubscribers.push(
      this.messageService.on('focus', ({ focus }) => {
        console.log('focus: ', this.uri);
        if (focus) {
          EXTENSION.activeEditorDocument = this;
        } else {
          this.clearActiveEditorDocument();
        }
      }),
    );
    this.unsubscribers.push(...new DocumentMessageHandlers(this).register());
  }

  dispose(): void {
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.clearActiveEditorDocument();
  }

  private clearActiveEditorDocument() {
    if (EXTENSION.activeEditorDocument === this) {
      EXTENSION.activeEditorDocument = null;
    }
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
    const before = structuredClone(this.boardPackage.document);
    edit(this.boardPackage.document);
    const after = structuredClone(this.boardPackage.document);

    this.documentChange.fire({
      document: this,
      undo: async () => {
        this.boardPackage.document = structuredClone(before);
        this.messageService.send({
          type: 'updateDocument',
          document: this.boardPackage.document,
        });
      },

      redo: async () => {
        this.boardPackage.document = structuredClone(after);
        this.messageService.send({
          type: 'updateDocument',
          document: this.boardPackage.document,
        });
      },
    });
  }
}
