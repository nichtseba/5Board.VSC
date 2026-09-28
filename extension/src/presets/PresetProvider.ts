import * as vscode from 'vscode';
import { EditorElementType, EditorState, ImageElementData, Preset } from '5board.vsc-common';

const PRESET_FILE_NAME = '5board-vsc-presets.json';
const PRESET_ASSET_DIRECTORY = 'preset-assets';

export class PresetProvider {
  public constructor(private readonly storageUri: vscode.Uri) {}

  public async loadPresets(): Promise<EditorState['presets']> {
    try {
      return await this.readPresetsFile();
    } catch (error) {
      if (!this.isFileNotFound(error)) {
        vscode.window.showWarningMessage(`Failed to load presets: ${String(error)}`);
      }
      return [];
    }
  }

  public async savePreset(preset: Preset, imageBytes?: Uint8Array): Promise<void> {
    await vscode.workspace.fs.createDirectory(this.storageUri);

    if (preset.asset && imageBytes) {
      const assetDirectory = vscode.Uri.joinPath(this.storageUri, PRESET_ASSET_DIRECTORY);
      await vscode.workspace.fs.createDirectory(assetDirectory);
      await vscode.workspace.fs.writeFile(
        vscode.Uri.joinPath(assetDirectory, preset.asset.fileName),
        imageBytes,
      );
    }

    const presets = await this.readPresetsForUpdate();
    presets.push(preset);
    await this.writePresets(presets);
  }

  public async deletePreset(id: string): Promise<Preset | undefined> {
    const presets = await this.readPresetsForUpdate();
    const deletedPreset = presets.find((preset) => preset.id === id);
    const nextPresets = presets.filter((preset) => preset.id !== id);

    if (!deletedPreset) {
      return undefined;
    }

    if (deletedPreset.asset) {
      try {
        await vscode.workspace.fs.delete(
          vscode.Uri.joinPath(
            this.storageUri,
            PRESET_ASSET_DIRECTORY,
            deletedPreset.asset.fileName,
          ),
          { useTrash: false },
        );
      } catch (error) {
        if (!this.isFileNotFound(error)) {
          throw error;
        }
      }
    }

    await this.writePresets(nextPresets);
    return deletedPreset;
  }

  public async loadPresetAsset(preset: Preset): Promise<Preset | undefined> {
    if (!preset.asset) {
      return undefined;
    }
    if (preset.asset.bytes) {
      return preset;
    }

    try {
      const file = vscode.Uri.joinPath(
        this.storageUri,
        PRESET_ASSET_DIRECTORY,
        preset.asset.fileName,
      );
      const bytes = await vscode.workspace.fs.readFile(file);
      return { ...preset, asset: { ...preset.asset, bytes } };
    } catch (error) {
      vscode.window.showWarningMessage(`Failed to load preset image: ${String(error)}`);
      return undefined;
    }
  }

  public async revealPresetsFile(presets: readonly Preset[]): Promise<void> {
    await vscode.workspace.fs.createDirectory(this.storageUri);
    const file = vscode.Uri.joinPath(this.storageUri, PRESET_FILE_NAME);

    try {
      await vscode.workspace.fs.stat(file);
    } catch (error) {
      if (!this.isFileNotFound(error)) {
        throw error;
      }
      await this.writePresets(presets);
    }

    await vscode.commands.executeCommand('revealFileInOS', file);
  }

  private async readPresetsForUpdate(): Promise<Preset[]> {
    try {
      return await this.readPresetsFile();
    } catch (error) {
      if (this.isFileNotFound(error)) {
        return [];
      }
      throw error;
    }
  }

  private async readPresetsFile(): Promise<Preset[]> {
    const file = vscode.Uri.joinPath(this.storageUri, PRESET_FILE_NAME);
    const fileContent = await vscode.workspace.fs.readFile(file);
    const parsed: unknown = JSON.parse(new TextDecoder().decode(fileContent));
    return Array.isArray(parsed) ? parsed.filter(isPreset).map(serializePreset) : [];
  }

  private async writePresets(presets: readonly Preset[]): Promise<void> {
    await vscode.workspace.fs.createDirectory(this.storageUri);
    const file = vscode.Uri.joinPath(this.storageUri, PRESET_FILE_NAME);
    await vscode.workspace.fs.writeFile(
      file,
      new TextEncoder().encode(JSON.stringify(presets.map(serializePreset), null, 2)),
    );
  }

  private isFileNotFound(error: unknown): boolean {
    return error instanceof vscode.FileSystemError && error.code === 'FileNotFound';
  }
}

function isPreset(value: unknown): value is Preset {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const preset = value as Partial<Preset>;
  const element = preset.element;
  const layout = element?.layout;
  const settings = preset.settings;
  const hasValidAsset =
    preset.asset === undefined ||
    (typeof preset.asset === 'object' &&
      typeof preset.asset.fileName === 'string' &&
      isSafeAssetFileName(preset.asset.fileName));
  const hasValidImageAsset =
    element?.type !== EditorElementType.Image ||
    (typeof (element.data as ImageElementData)?.src === 'string' && !!preset.asset);

  return (
    typeof preset.id === 'string' &&
    typeof preset.name === 'string' &&
    !!settings &&
    typeof settings.keepStyle === 'boolean' &&
    typeof settings.keepXPosition === 'boolean' &&
    typeof settings.keepContent === 'boolean' &&
    !!element &&
    Object.values(EditorElementType).includes(element.type) &&
    !!layout &&
    Number.isFinite(layout.xPos) &&
    Number.isFinite(layout.yPos) &&
    Number.isFinite(layout.width) &&
    Number.isFinite(layout.height) &&
    !!element.style &&
    typeof element.style.visible === 'boolean' &&
    hasValidAsset &&
    hasValidImageAsset
  );
}

function isSafeAssetFileName(fileName: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(fileName);
}

function serializePreset(preset: Preset): Preset {
  return {
    ...preset,
    asset: preset.asset ? { fileName: preset.asset.fileName } : undefined,
  };
}
