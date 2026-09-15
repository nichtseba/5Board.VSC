import { EXTENSION } from '../extension';
import * as vscode from 'vscode';
import { t } from '../localization';
import { EditorElement, EditorState, EditorElementType, Preset } from '5board.vsc-common';

export async function savePresetsToFile(context: vscode.ExtensionContext): Promise<void> {
  if (
    EXTENSION.activeEditorDocument?.boardPackage.document.content.primarySelectedElementId === null
  ) {
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

  const selected = await vscode.window.showQuickPick(options, {
    title: t('extension.presets.presetOptions'),
    placeHolder: t('extension.presets.selectOptions'),
    canPickMany: true,
  });

  if (selected === undefined) {
    return;
  }

  const config = {
    name,
    options: selected.map((x) => x.key),
  };

  // Create Preset
  const selectedElementId =
    EXTENSION.activeEditorDocument?.boardPackage.document.content.primarySelectedElementId;
  const selectedElement =
    EXTENSION.activeEditorDocument?.boardPackage.document.content.elements.find(
      (e) => e.id === selectedElementId,
    );
  const preset = {
    id: crypto.randomUUID(),
    name: config.name,
    settings: {
      keepStyle: config.options.includes('keepStyle'),
      keepXPosition: config.options.includes('keepXPosition'),
      keepContent: config.options.includes('keepContent'),
    },
    element: selectedElement as EditorElement,
  };

  // Save Preset to Json
  const storageDir = context?.globalStorageUri;
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
  vscode.window.showInformationMessage(t('extension.presets.presetSaved'));

  // Update EditorState
  EXTENSION.editorState = {
    presets: [...(EXTENSION.editorState.presets ?? []), preset],
  };
}

export async function loadPresetsFromFile(
  context: vscode.ExtensionContext,
): Promise<EditorState['presets']> {
  const file = vscode.Uri.joinPath(context.globalStorageUri, '5board-vsc-presets.json');
  try {
    const fileContent = await vscode.workspace.fs.readFile(file);
    const presets = JSON.parse(new TextDecoder().decode(fileContent));
    return Array.isArray(presets) ? presets.filter(isPreset) : [];
  } catch (error) {
    if (!(error instanceof vscode.FileSystemError) || error.code !== 'FileNotFound') {
      vscode.window.showWarningMessage(`Failed to load presets: ${String(error)}`);
    }
    return [];
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
    typeof element.style.visible === 'boolean'
  );
}
export async function deletePreset(id: string, context: vscode.ExtensionContext): Promise<void> {
  const presets = EXTENSION.editorState.presets ?? [];
  const nextPresets = presets.filter((preset) => preset.id !== id);

  if (nextPresets.length === presets.length || !context) {
    return;
  }

  const file = vscode.Uri.joinPath(context.globalStorageUri, '5board-vsc-presets.json');
  await vscode.workspace.fs.writeFile(
    file,
    new TextEncoder().encode(JSON.stringify(nextPresets, null, 2)),
  );
  EXTENSION.editorState = { presets: nextPresets };
}

export async function revealPresetsFile(context: vscode.ExtensionContext): Promise<void> {
  if (!context) {
    return;
  }

  const storageDir = context.globalStorageUri;
  const file = vscode.Uri.joinPath(storageDir, '5board-vsc-presets.json');
  await vscode.workspace.fs.createDirectory(storageDir);

  try {
    await vscode.workspace.fs.stat(file);
  } catch (error) {
    if (!(error instanceof vscode.FileSystemError) || error.code !== 'FileNotFound') {
      throw error;
    }

    await vscode.workspace.fs.writeFile(
      file,
      new TextEncoder().encode(JSON.stringify(EXTENSION.editorState.presets ?? [], null, 2)),
    );
  }

  await vscode.commands.executeCommand('revealFileInOS', file);
}
