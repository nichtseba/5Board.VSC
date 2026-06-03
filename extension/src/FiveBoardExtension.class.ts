import { Command } from './decorators/Command.decorator';
import { Extension } from './Extension.class';
import * as vscode from 'vscode';
import { MessageService } from './MessageService';
import { PackageManager } from './PackageManager.class';
import { EditorEditorProvider } from './providers/EditorEditorProvider';
import { t } from './localization';
import path from 'path';
import { BoardPackage } from './board/package';
import {
  ElementSettingsSidebarViewProvider,
  SidebarViewProvider,
} from './providers/SidebarViewProvider';
import { StructureTreeProvider } from './providers/StructureTreeProvider';
import { BoardCustomDocument } from './board/BoardCustomDocument';
import { BoardDocument } from '5board.vsc-common';

export class FiveBoardExtension extends Extension {
  private messages = new MessageService();
  public readonly packageManager = new PackageManager();
  public activeEditorDocument: BoardCustomDocument | null = null;

  public constructor() {
    super();
  }

  public activate(context: vscode.ExtensionContext): void {
    super.activate(context);
    new EditorEditorProvider(context, this.packageManager).register();
    new SidebarViewProvider(context, this.messages).register();
    new ElementSettingsSidebarViewProvider(context, this.messages).register();
    new StructureTreeProvider(context).register();
  }

  @Command('5board-vsc.newBoard')
  async new5boardCommand(): Promise<void> {
    try {
      const targetUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri,
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
      await vscode.commands.executeCommand(
        'vscode.openWith',
        targetUri,
        EditorEditorProvider.VIEW_TYPE,
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `${t('extension.new5boardCommand.createFileFailed')} ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  @Command('5board-vsc.startPresentation')
  startPresentationCommand(): void {
    vscode.window.showInformationMessage('Presentation started');
  }

  public applyEditToActiveDocument(edit: (document: BoardDocument) => void): void {
    if (!this.activeEditorDocument) {
      return;
    }
    this.activeEditorDocument.applyEdit(edit);
  }

  public setActiveEditorDocument(document: BoardCustomDocument): void {
    this.activeEditorDocument = document;
  }

  public clearActiveEditorDocument(document: BoardCustomDocument): void {
    if (this.activeEditorDocument === document) {
      this.activeEditorDocument = null;
    }
  }
}
