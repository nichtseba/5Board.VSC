import vscode from 'vscode';
import { BoardPackage } from './package';
import { BoardDocument } from '5board.vsc-common';
import { MessageService } from '../MessageService';
import { ExecutionService } from '../runner/ExecutionService';
import { EXTENSION } from '../extension';

export class BoardCustomDocument implements vscode.CustomDocument {
  public readonly documentChange = new vscode.EventEmitter<BoardDocument>();
  public readonly onDocumentChange = this.documentChange.event;
  public readonly messageService = new MessageService();

  private readonly executionService = new ExecutionService();

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
      EXTENSION.activeEditorDocument = this;
    });

    this.messageService.on('executeCodeblock', (msg) => {
      void this.executeBlock(msg.elementId);
    });

    this.onDocumentChange((document) => {
      this.messageService.send({ type: 'updateDocument', document });
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

  public async executeBlock(elementId: string): Promise<void> {
    const result = await this.executionService.execute(this.boardPackage.document, elementId);

    // Execution results are transient UI state — they are sent to the webviews and held
    // in local React state there, never written back into the (persisted) document.
    this.messageService.send({
      type: 'codeblockResult',
      elementId,
      output: {
        stdout: result.stdout,
        // Surface execution-level errors (no runner, source missing, timeout) that have
        // no stderr of their own, so the user sees them instead of an empty output.
        stderr: result.stderr || result.error || '',
        success: result.success,
        exitCode: result.exitCode,
      },
    });
  }
}
