import * as vscode from 'vscode';
import { MessageService } from './MessageService';
import { EditorEditorProvider } from './providers/EditorEditorProvider';
import { t } from './localization';
import path from 'path';
import { BoardPackage } from './board/package';
import { BoardCustomDocument } from './board/BoardCustomDocument';
import {
  BoardDocument,
  DEFAULT_ELEMENT_PROFILES,
  DEFAULT_TOOL_ID,
  EditorElement,
  EditorElementDataMap,
  EditorElementType,
  EditorState,
} from '5board.vsc-common';
import { Command, ExtensionBase } from './ExtensionBase';
import { FiveBoardFileSystemProvider } from './FiveBoardFileSystemProvider';
import { PackageManager } from './PackageManager';
import { SidebarManager } from './sidebar/SidebarManager';

export class FiveBoardExtension extends ExtensionBase {
  private messages = new MessageService();
  public readonly packageManager = new PackageManager();

  private activeEditorDocument_: BoardCustomDocument | null = null;
  public get activeEditorDocument(): BoardCustomDocument | null {
    return this.activeEditorDocument_;
  }
  public set activeEditorDocument(document: BoardCustomDocument | null) {
    this.activeEditorDocument_ = document;
    this.activeDocumentChange.fire(document);
  }
  private activeDocumentChange = new vscode.EventEmitter<BoardCustomDocument | null>();
  public onActiveDocumentChange = this.activeDocumentChange.event;

  private editorState_: EditorState = { tool: { type: DEFAULT_TOOL_ID, parameters: undefined } };
  public get editorState(): EditorState {
    return this.editorState_;
  }
  public set editorState(state: Partial<EditorState>) {
    this.editorState_ = { ...this.editorState_, ...state };
    this.editorStateChange.fire(this.editorState_);
  }
  private editorStateChange = new vscode.EventEmitter<EditorState>();
  public onEditorStateChange = this.editorStateChange.event;

  public constructor() {
    super();
  }

  public activate(context: vscode.ExtensionContext): void {
    super.activate(context);
    new EditorEditorProvider(context, this.packageManager).register();
    context.subscriptions.push(new SidebarManager(context, this.messages));
    new FiveBoardFileSystemProvider(this.packageManager).register(context);
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

  @Command('5board-vsc.deleteEditorElement')
  deleteEditorElement(id: string): void {
    this.applyEditToActiveDocument((document) => {
      document.content.elements = document.content.elements.filter((e) => e.id !== id);
    });
  }

  @Command('5board-vsc.addNewEditorElement')
  addNewEditorElement(type: EditorElementType, position: EditorElement['layout']): void {
    const element = this.createDefaultElement(type, position);

    this.applyEditToActiveDocument((document) => {
      document.content.elements.push(element);
    });
  }

  private createDefaultElement<T extends EditorElementType>(
    type: T,
    position: EditorElement['layout'],
  ): EditorElement<T> {
    const profile = DEFAULT_ELEMENT_PROFILES[type];

    return {
      id: crypto.randomUUID(),
      type,
      layout: {
        ...position,
        width: profile.layout.width,
        height: profile.layout.height,
      },
      style: {
        visible: true,
      },
      data: structuredClone(profile.data) as EditorElementDataMap[T],
    };
  }

  public applyEditToActiveDocument(edit: (document: BoardDocument) => void): void {
    if (!this.activeEditorDocument) {
      return;
    }
    this.activeEditorDocument.applyEdit(edit);
    this.activeDocumentChange.fire(this.activeEditorDocument);
  }
}
