import vscode from 'vscode';
import path from 'path';
import { SidebarDocumentSync } from './SidebarDocumentSync';
import { MessageService } from '../MessageService';
import {
  ElementSettingsSidebarViewProvider,
  SidebarViewProvider,
} from '../providers/SidebarViewProvider';
import { StructureTreeProvider } from '../providers/StructureTreeProvider';
import { EXTENSION } from '../extension';
import { EditorElementType } from '5board.vsc-common';

export class SidebarManager implements vscode.Disposable {
  private readonly sync: SidebarDocumentSync;

  constructor(
    context: vscode.ExtensionContext,
    private readonly messages: MessageService,
  ) {
    new SidebarViewProvider(context, messages).register();
    new ElementSettingsSidebarViewProvider(context, messages).register();
    new StructureTreeProvider(context).register();

    this.sync = new SidebarDocumentSync(messages);

    this.registerMessageHandlers();
  }

  private registerMessageHandlers(): void {
    this.messages.on('selectTool', (msg) => {
      EXTENSION.editorState = {
        tool: msg.tool,
      };
    });

    // Todo: move to document handling
    this.messages.on('updateElement', (msg) => {
      if (!EXTENSION.activeEditorDocument) {
        return;
      }
      EXTENSION.activeEditorDocument.applyEdit((document) => {
        const index = document.content.elements.findIndex((e) => e.id === msg.id);

        if (index !== -1) {
          document.content.elements[index] = {
            ...document.content.elements[index],
            ...msg.changes,
          };
        }
      });
    });

    this.messages.on('addImageFromFile', async () => {
      const activeDocument = EXTENSION.activeEditorDocument;

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
      const mime = mimeFromFileName(assetName);

      activeDocument.applyEdit((document) => {
        document.assets.push({
          name: assetName,
          mime,
          bytes,
        });

        document.content.elements.push({
          id: assetName,
          type: EditorElementType.Image,
          layout: {
            xPos: 0,
            yPos: 0,
            width: 18,
            height: 12,
          },
          style: {
            visible: true,
          },
          data: {
            src: assetName,
            content: '',
            title: assetName,
            altText: assetName,
          },
        });
      });
    });
  }

  dispose(): void {
    this.sync.dispose();
  }
}

function mimeFromFileName(fileName: string): string {
  const lower = fileName.toLowerCase();

  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';

  return 'application/octet-stream';
}
