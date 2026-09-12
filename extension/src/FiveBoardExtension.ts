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
  EditorElement,
  EditorElementDataMap,
  EditorElementType,
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
import { EXTENSION } from './extension';

export class FiveBoardExtension extends ExtensionBase {
  private messages = new MessageService();
  private context: vscode.ExtensionContext | undefined;
  public readonly packageManager = new PackageManager();
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

  private editorState_: EditorState = {
    tool: { type: DEFAULT_TOOL_ID, parameters: undefined },
    presets: [],
  };
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

  public async activate(context: vscode.ExtensionContext): Promise<void> {
    this.context = context;
    this.editorState_ = {
      tool: { type: DEFAULT_TOOL_ID, parameters: undefined },
      presets: await this.loadPresets(),
    };
    super.activate(context);
    new EditorEditorProvider(context, this.packageManager).register();
    new ProjectorProvider(context).register();
    context.subscriptions.push(new SidebarManager(context, this.messages));
    new FiveBoardFileSystemProvider(this.packageManager).register(context);
  }

  private async loadPresets(): Promise<EditorState['presets']> {
    if (!this.context) {
      return [];
    }

    const file = vscode.Uri.joinPath(this.context.globalStorageUri, '5board-vsc-presets.json');
    try {
      const fileContent = await vscode.workspace.fs.readFile(file);
      const presets = JSON.parse(new TextDecoder().decode(fileContent));
      return Array.isArray(presets) ? presets : [];
    } catch (error) {
      if (!(error instanceof vscode.FileSystemError) || error.code !== 'FileNotFound') {
        vscode.window.showWarningMessage(`Failed to load presets: ${String(error)}`);
      }
      return [];
    }
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

  @Command('5board-vsc.savePreset')
  async savePresetCommand(): Promise<void> {
    if (EXTENSION.activeEditorDocument?.boardPackage.document.content.selectedElementId === null) {
      vscode.window.showWarningMessage(
        'No element selected. Please select an element to save as a preset.',
      );
      return;
    }

    const name = await vscode.window.showInputBox({
      title: 'Save element as Preset',
      prompt: 'Enter the name',
      placeHolder: 'My favarite element',
    });

    if (name === undefined) {
      return;
    }

    const options = [
      { label: 'keep style', picked: true },
      { label: 'keep x-Position', picked: false },
      { label: 'keep content', picked: false },
    ];

    const selected = await vscode.window.showQuickPick(options, {
      title: 'Preset options',
      placeHolder: 'Select options',
      canPickMany: true,
    });

    if (selected === undefined) {
      return;
    }

    const config = {
      name,
      options: selected.map((x) => x.label),
    };

    // Create Preset
    const selectedElementId =
      EXTENSION.activeEditorDocument?.boardPackage.document.content.selectedElementId;
    const selectedElement =
      EXTENSION.activeEditorDocument?.boardPackage.document.content.elements.find(
        (e) => e.id === selectedElementId,
      );
    const preset = {
      id: crypto.randomUUID(),
      name: config.name,
      settings: {
        keepStyle: config.options.includes('keep style'),
        keepXPosition: config.options.includes('keep x-Position'),
        keepContent: config.options.includes('keep content'),
      },
      element: selectedElement as EditorElement,
    };

    // Save Preset to Json
    const storageDir = this.context?.globalStorageUri;
    if (!storageDir) {
      return;
    }
    await vscode.workspace.fs.createDirectory(storageDir);

    const file = vscode.Uri.joinPath(storageDir, '5board-vsc-presets.json');
    let data;
    try {
      const fileContent = await vscode.workspace.fs.readFile(file);
      data = JSON.parse(new TextDecoder().decode(fileContent));
    } catch (error) {
      if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
        data = [];
      }
    }
    data.push(preset);

    const bytes = new TextEncoder().encode(JSON.stringify(data, null, 2));

    await vscode.workspace.fs.writeFile(file, bytes);
    vscode.window.showInformationMessage(`Preset saved successfully.`);

    // Update EditorState
    this.editorState = {
      presets: [...(this.editorState.presets ?? []), preset],
    };
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
    initialData?: Partial<EditorElement>,
  ): void {
    const element = this.createDefaultElement(type, position, initialData);

    this.applyEditToActiveDocument((document) => {
      document.content.elements.push(element);
    });
  }

  private createDefaultElement<T extends EditorElementType>(
    type: T,
    position: EditorElement['layout'],
    initialData?: Partial<EditorElement>,
  ): EditorElement<T> {
    const profile = DEFAULT_ELEMENT_PROFILES[type];

    return {
      id: crypto.randomUUID(),
      type,
      layout: {
        ...profile.layout,
        ...position,
        ...(initialData?.layout ?? {}),
      },

      style: {
        ...structuredClone(profile.style),
        ...(initialData?.style ?? {}),
      },
      data: {
        ...structuredClone(profile.data),
        ...(initialData?.data ? initialData.data : {}),
      } as EditorElementDataMap[T],
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
