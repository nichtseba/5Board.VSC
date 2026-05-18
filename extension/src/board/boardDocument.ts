import * as path from 'path';
import * as vscode from 'vscode';
import { FiveBoardzDocument } from '5board.vsc-common';
import { read5boardzPackage, write5boardzPackage } from './boardPackage';
import { loadOld5boardFile } from './legacyImport';

export const FIVEBOARD_EDITOR_VIEW_TYPE = '5board-vsc.editor';
export type FiveBoardDocumentSource = 'package' | 'legacy';

export class FiveBoardDocument implements vscode.CustomDocument {
  packageUri?: vscode.Uri;

  constructor(
    public readonly uri: vscode.Uri,
    public fiveBoardz: FiveBoardzDocument,
    public readonly source: FiveBoardDocumentSource,
  ) {}

  dispose(): void {
    /* no document resources */
  }
}

export async function load5boardDocument(uri: vscode.Uri): Promise<FiveBoardDocument> {
  // .5boardz is loaded directly from the ZIP, .5board is only converted in memory.
  if (is5boardzUri(uri)) {
    return new FiveBoardDocument(uri, await read5boardzPackage(uri), 'package');
  }

  if (isOld5boardUri(uri)) {
    return new FiveBoardDocument(uri, await loadOld5boardFile(uri), 'legacy');
  }

  throw new Error('Es sind nur .5board und .5boardz Dateien zulässig.');
}

export async function reload5boardDocument(document: FiveBoardDocument): Promise<void> {
  document.fiveBoardz =
    document.source === 'package'
      ? await read5boardzPackage(document.uri)
      : await loadOld5boardFile(document.uri);
}

export async function save5boardDocument(
  document: FiveBoardDocument,
  targetUri: vscode.Uri,
): Promise<void> {
  // When a .5board document is saved again, it is saved as a new .5boardz package
  if (document.source === 'legacy') {
    const isDefaultLegacySave = targetUri.toString() === document.uri.toString();
    await saveOld5boardAs5boardzPackage(document, isDefaultLegacySave ? undefined : targetUri);
    return;
  }

  await write5boardzPackage(as5boardzUri(targetUri), document.fiveBoardz);
}

// Function that saves .5board documents as .5boardz package
export async function saveOld5boardAs5boardzPackage(
  document: FiveBoardDocument,
  requestedTargetUri?: vscode.Uri,
): Promise<vscode.Uri> {
  if (document.source !== 'legacy') {
    throw new Error('Nur .5board Dokumente können als .5boardz Pakete gespeichert werden.');
  }

  const targetUri = requestedTargetUri
    ? as5boardzUri(requestedTargetUri)
    : (document.packageUri ?? (await nextOld5boardTargetUri(document.uri)));

  await write5boardzPackage(targetUri, document.fiveBoardz);
  document.packageUri = targetUri;
  vscode.window.showInformationMessage(
    `5boardz Datei gespeichert: ${path.basename(targetUri.fsPath)}.`,
  );

  return targetUri;
}

export function isOld5boardUri(uri: vscode.Uri): boolean {
  return uri.fsPath.toLowerCase().endsWith('.5board');
}

export function is5boardzUri(uri: vscode.Uri): boolean {
  return uri.fsPath.toLowerCase().endsWith('.5boardz');
}

export function as5boardzUri(uri: vscode.Uri): vscode.Uri {
  if (is5boardzUri(uri)) {
    return uri;
  }

  const extension = path.extname(uri.fsPath);
  const targetPath =
    extension.length > 0
      ? `${uri.fsPath.slice(0, -extension.length)}.5boardz`
      : `${uri.fsPath}.5boardz`;

  return vscode.Uri.file(targetPath);
}

// Searches for a free path for saving the package
async function nextOld5boardTargetUri(sourceUri: vscode.Uri): Promise<vscode.Uri> {
  const directory = vscode.Uri.file(path.dirname(sourceUri.fsPath));
  const baseName = path.basename(sourceUri.fsPath, path.extname(sourceUri.fsPath));
  const firstCandidate = vscode.Uri.joinPath(directory, `${baseName}.5boardz`);

  if (!(await exists(firstCandidate))) {
    return firstCandidate;
  }

  for (let index = 1; index < 1000; index += 1) {
    const suffix = index === 1 ? 'imported' : `imported-${index}`;
    const candidate = vscode.Uri.joinPath(directory, `${baseName}-${suffix}.5boardz`);
    if (!(await exists(candidate))) {
      return candidate;
    }
  }

  throw new Error(`Konnte keinen freien Zielnamen für ${baseName}.5boardz finden.`);
}

async function exists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}
