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
  AddElementDefaults,
  EditorElement,
  EditorElementDataMap,
  EditorElementType,
  ImageElementData,
  EditorToolId,
  DEFAULT_PROJECTOR_POINTER_STYLE,
  DEFAULT_TOOL_ID,
  EditorState,
  ProjectorPointerStyle,
} from '5board.vsc-common';
import { Command, ExtensionBase } from './ExtensionBase';
import { ProjectorProvider } from './providers/ProjectorProvider';
import { FiveBoardFileSystemProvider } from './FiveBoardFileSystemProvider';
import { PackageManager } from './PackageManager';
import { SidebarManager } from './sidebar/SidebarManager';
import { SettingsService } from './SettingsService';
import { addImageAsset } from './board/addImageToDocument';

export class FiveBoardExtension extends ExtensionBase {
  private messages = new MessageService();
  public readonly packageManager = new PackageManager();
  public readonly settingsService = new SettingsService();
  private openDocuments = new Map<string, BoardCustomDocument>();

  public registerDocument(document: BoardCustomDocument): void {
    if (!this.openDocuments.has(document.uri.toString())) {
      this.openDocuments.set(document.uri.toString(), document);
    }
  }

  public unregisterDocument(uri: vscode.Uri): void {
    this.openDocuments.delete(uri.toString());
  }

  public getDocumentForUri(uri: vscode.Uri): BoardCustomDocument | undefined {
    return this.openDocuments.get(uri.toString());
  }

  public cursorTrackingEnabled = true;
  public projectorPointerStyle: ProjectorPointerStyle = DEFAULT_PROJECTOR_POINTER_STYLE;

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
    context.subscriptions.push(this.settingsService);
    new EditorEditorProvider(context, this.packageManager).register();
    new ProjectorProvider(context).register();
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
      const settings = this.settingsService.getSettings();
      await BoardPackage.createEmpty(title, settings.grid).write(targetUri);
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
  async startPresentationCommand(): Promise<void> {
    const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
    const tabInput = activeTab?.input;

    if (
      tabInput instanceof vscode.TabInputCustom &&
      tabInput.viewType === EditorEditorProvider.VIEW_TYPE
    ) {
      await vscode.commands.executeCommand(
        'vscode.openWith',
        tabInput.uri,
        ProjectorProvider.VIEW_TYPE,
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      );
      await vscode.commands.executeCommand('workbench.action.focusLastEditorGroup');
      await vscode.commands.executeCommand('workbench.action.moveEditorGroupToNewWindow');
    } else {
      vscode.window.showWarningMessage(t('extension.projector.noFileOpen'));
    }
  }

  @Command('5board-vsc.deleteEditorElement')
  deleteEditorElement(id: string): void {
    this.applyEditToActiveDocument((document) => {
      document.content.elements = document.content.elements.filter((e) => e.id !== id);
    });
  }

  @Command('5board-vsc.addNewEditorElement')
  addNewEditorElement(
    type: EditorElementType,
    position: EditorElement['layout'],
    defaults?: AddElementDefaults,
  ): void {
    this.applyEditToActiveDocument((document) => {
      const element = this.createDefaultElement(type, position, defaults, document);
      document.content.elements.push(element);
    });
  }

  private createDefaultElement<T extends EditorElementType>(
    type: T,
    position: EditorElement['layout'],
    defaults: AddElementDefaults<T> | undefined,
    document: BoardDocument,
  ): EditorElement<T> {
    const profile = DEFAULT_ELEMENT_PROFILES[type];
    const data = {
      ...structuredClone(profile.data),
      ...defaults?.data,
    } as EditorElementDataMap[T];

    if (type === EditorElementType.Image && defaults?.asset) {
      const assetName = addImageAsset(
        document,
        defaults.asset.name,
        new Uint8Array(defaults.asset.bytes),
      );
      const imageData = data as ImageElementData;
      Object.assign(imageData, {
        src: assetName,
        title: imageData.title ?? assetName,
        altText: imageData.altText ?? assetName,
        configuredWidth: false,
      });
    }

    return {
      id: crypto.randomUUID(),
      type,
      layout: {
        ...position,
        width: defaults?.layout?.width ?? profile.layout.width,
        height: defaults?.layout?.height ?? profile.layout.height,
      },
      style: {
        visible: true,
        ...defaults?.style,
      },
      data,
    };
  }

  @Command('5board-vsc.addImageFromFile')
  async addImageFromFileCommand(): Promise<void> {
    const activeDocument = this.activeEditorDocument;

    if (!activeDocument) {
      vscode.window.showInformationMessage('No active 5board document');
      return;
    }

    const uris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      filters: {
        Images: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'],
      },
    });

    const fileUri = uris?.[0];

    if (!fileUri) {
      return;
    }

    const bytes = await vscode.workspace.fs.readFile(fileUri);
    const assetName = path.basename(fileUri.fsPath);
    this.editorState = {
      tool: {
        type: EditorToolId.AddElement,
        parameters: {
          type: EditorElementType.Image,
          placementMode: 'free',
          defaults: {
            asset: {
              name: assetName,
              bytes: Array.from(bytes),
            },
          },
        },
      },
    };
  }

  public applyEditToActiveDocument(edit: (document: BoardDocument) => void): void {
    if (!this.activeEditorDocument) {
      return;
    }
    this.activeEditorDocument.applyEdit(edit);
    this.activeDocumentChange.fire(this.activeEditorDocument);
  }

  @Command('5board-vsc.goToElement')
  public goToElement(elementId: string): void {
    if (!this.activeEditorDocument) {
      return;
    }
    this.activeEditorDocument.messageService.send({ type: 'goToElement', elementId }, undefined);
  }
}
