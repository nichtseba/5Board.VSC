import vscode from 'vscode';
import { BoardPackage } from './package';
import { BoardDocument } from '5board.vsc-common';
import { MessageService } from '../MessageService';
import { EXTENSION } from '../extension';
import { t } from '../localization';

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
      EXTENSION.activeEditorDocument = this;
    });
    this.messageService.on('saveHtmlExport', async (msg) => {
      await this.saveHtmlExport(msg.html, msg.backgroundColor);
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

  public async saveHtmlExport(html: string, backgroundColor: string): Promise<void> {
    const exportHtml = createHtmlExport(html, backgroundColor);

    const defaultUri = this.uri.with({
      path: this.uri.path.replace(/\.[^/.]+$/, '.html'),
    });

    const targetUri = await vscode.window.showSaveDialog({
      defaultUri,
      filters: {
        HTML: ['html', 'htm'],
      },
      saveLabel: t('extension.htmlExport.saveLabel'),
    });

    if (!targetUri) {
      return;
    }

    await vscode.workspace.fs.writeFile(targetUri, new TextEncoder().encode(exportHtml));

    vscode.window.showInformationMessage(`${t('extension.htmlExport.saved')} ${targetUri.fsPath}`);
  }

  public applyEdit(edit: (document: BoardDocument) => void): void {
    edit(this.boardPackage.document);
    this.documentChange.fire(this.boardPackage.document);
  }
}

function createHtmlExport(html: string, backgroundColor: string): string {
  return `<!doctype html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>5Board Export</title>
      <style>
        html, 
        body {
          background: ${backgroundColor};
        }
      </style>
    </head>
    <body>
    ${html}
    </body>
    </html>`;
}
