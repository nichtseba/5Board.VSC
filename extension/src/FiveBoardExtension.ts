import * as vscode from 'vscode';
import { MessageService } from './MessageService';
import { EditorEditorProvider } from './providers/EditorEditorProvider';
import { t } from './localization';
import path from 'path';
import { BoardPackage } from './board/package';
import { BoardCustomDocument } from './board/BoardCustomDocument';
import {
  BoardDocument,
  AddElementDefaults,
  EditorElement,
  EditorElementType,
  EditorToolId,
  DEFAULT_PROJECTOR_POINTER_STYLE,
  DEFAULT_TOOL_ID,
  EditorState,
  ImageElementData,
  Preset,
  ProjectorPointerStyle,
  createAddElementToolFromPreset,
} from '5board.vsc-common';
import { Command, ExtensionBase } from './ExtensionBase';
import { ProjectorProvider } from './providers/ProjectorProvider';
import { FiveBoardFileSystemProvider } from './FiveBoardFileSystemProvider';
import { PackageManager } from './PackageManager';
import { SidebarManager } from './sidebar/SidebarManager';
import { createDefaultElement } from './board/addElement/createDefaultElement';
import { PresetProvider } from './presets/PresetProvider';

export class FiveBoardExtension extends ExtensionBase {
  private messages = new MessageService();
  private presetProvider!: PresetProvider;
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
  public projectorPaused = false;
  public projectorPointerStyle: ProjectorPointerStyle = DEFAULT_PROJECTOR_POINTER_STYLE;
  // Document with an attached projector; unlike activeEditorDocument, not tied to editor focus.
  private projectorDocument_: BoardCustomDocument | null = null;
  public get projectorDocument(): BoardCustomDocument | null {
    return this.projectorDocument_;
  }
  public set projectorDocument(document: BoardCustomDocument | null) {
    this.projectorDocument_ = document;
    this.projectorDocumentChange.fire(document);
  }
  // Sidebars run on their own MessageService, so push attach/detach to them here.
  private projectorDocumentChange = new vscode.EventEmitter<BoardCustomDocument | null>();
  public onProjectorDocumentChange = this.projectorDocumentChange.event;

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
    super.activate(context);
    this.presetProvider = new PresetProvider(context.globalStorageUri);
    this.editorState_ = {
      tool: { type: DEFAULT_TOOL_ID, parameters: undefined },
      presets: await this.presetProvider.loadPresets(),
    };
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
    const activeDocument = this.activeEditorDocument;
    if (!activeDocument) {
      vscode.window.showWarningMessage(t('extension.presets.noElementSelected'));
      return;
    }

    const selectedElementId = activeDocument.boardPackage.document.content.primarySelectedElementId;
    const selectedElement = activeDocument.boardPackage.document.content.elements.find(
      (element) => element.id === selectedElementId,
    );
    if (!selectedElement) {
      vscode.window.showWarningMessage(t('extension.presets.noElementSelected'));
      return;
    }

    const name = await vscode.window.showInputBox({
      title: t('extension.presets.savePreset'),
      prompt: t('extension.presets.presetName'),
      placeHolder: t('extension.presets.presetNamePlaceholder'),
    });
    if (name === undefined) {
      return;
    }

    const options = [
      { key: 'keepStyle', label: t('extension.presets.keepStyle'), picked: true },
      { key: 'keepXPosition', label: t('extension.presets.keepPosition'), picked: false },
      { key: 'keepContent', label: t('extension.presets.keepContent'), picked: false },
    ];
    const selectedOptions = await vscode.window.showQuickPick(options, {
      title: t('extension.presets.presetOptions'),
      placeHolder: t('extension.presets.selectOptions'),
      canPickMany: true,
    });
    if (!selectedOptions?.length) {
      vscode.window.showInformationMessage(t('extension.presets.presetNotSaved'));
      return;
    }

    const optionKeys = selectedOptions.map((option) => option.key);
    const preset: Preset = {
      id: crypto.randomUUID(),
      name,
      settings: {
        keepStyle: optionKeys.includes('keepStyle'),
        keepXPosition: optionKeys.includes('keepXPosition'),
        keepContent: optionKeys.includes('keepContent'),
      },
      element: selectedElement,
    };

    let imageBytes: Uint8Array | undefined;
    if (selectedElement.type === EditorElementType.Image) {
      const imageData = selectedElement.data as ImageElementData;
      const asset = activeDocument.boardPackage.document.assets.find(
        (candidate) => candidate.name === imageData.src,
      );
      if (!asset) {
        vscode.window.showWarningMessage(t('extension.presets.imageAssetMissing'));
        return;
      }
      imageBytes = asset.bytes;
      preset.asset = { fileName: `${preset.id}.bin` };
      if (!(optionKeys.includes('keepStyle') && optionKeys.length === 1)) {
        imageData.configuredWidth = true;
      }
    }

    await this.presetProvider.savePreset(preset, imageBytes);
    vscode.window.showInformationMessage(t('extension.presets.presetSaved'));
    this.editorState = { presets: [...(this.editorState.presets ?? []), preset] };
  }

  @Command('5board-vsc.deletePreset')
  async deletePreset(id?: string): Promise<void> {
    let presetId = id;
    if (!presetId) {
      const presets = this.editorState.presets ?? [];
      if (presets.length === 0) {
        return;
      }
      const selected = await vscode.window.showQuickPick(
        presets.map((preset) => ({ label: preset.name, description: preset.id })),
      );
      presetId = selected?.description;
    }
    if (!presetId) {
      return;
    }

    const deletedPreset = await this.presetProvider.deletePreset(presetId);
    if (deletedPreset) {
      this.editorState = {
        presets: (this.editorState.presets ?? []).filter((preset) => preset.id !== presetId),
      };
    }
  }

  async loadPresetAsset(id: string): Promise<void> {
    const preset = (this.editorState.presets ?? []).find((candidate) => candidate.id === id);
    if (!preset) {
      return;
    }
    const presetWithAsset = await this.presetProvider.loadPresetAsset(preset);
    if (!presetWithAsset) {
      return;
    }
    this.editorState = {
      tool: createAddElementToolFromPreset(presetWithAsset),
    };
  }

  @Command('5board-vsc.revealPresetsFile')
  async revealPresetsFile(): Promise<void> {
    await this.presetProvider.revealPresetsFile(this.editorState.presets ?? []);
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
      const element = createDefaultElement(type, position, defaults, document);
      document.content.elements.push(element);
    });
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
