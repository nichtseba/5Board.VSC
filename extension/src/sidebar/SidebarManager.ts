import vscode from 'vscode';
import { SidebarDocumentSync } from './SidebarDocumentSync';
import { MessageService } from '../MessageService';
import {
  ElementSettingsSidebarViewProvider,
  SidebarViewProvider,
} from '../providers/SidebarViewProvider';
import { StructureTreeProvider } from '../providers/StructureTreeProvider';
import { EXTENSION } from '../extension';

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

    this.messages.on('addElement', (msg) => {
      EXTENSION.addNewEditorElement(msg.elementType);
    });
    this.messages.on('deleteElement', (msg) => {
      EXTENSION.deleteEditorElement(msg.id);
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
  }

  dispose(): void {
    this.sync.dispose();
  }
}
