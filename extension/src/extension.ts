import vscode from 'vscode';
import { FiveBoardExtension } from './FiveBoardExtension';

export const EXTENSION = new FiveBoardExtension();

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  await EXTENSION.activate(context);
}

export function deactivate() {
  EXTENSION.deactivate();
}
