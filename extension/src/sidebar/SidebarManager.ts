import vscode from 'vscode';
import { SidebarDocumentSync } from './SidebarDocumentSync';
import { MessageService } from '../MessageService';
import {
  ElementSettingsSidebarViewProvider,
  SidebarViewProvider,
} from '../providers/SidebarViewProvider';
import { StructureTreeProvider } from '../providers/StructureTreeProvider';
import { EXTENSION } from '../extension';
import deepEquals from 'deep-equal';

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
    this.messages.on('textEditorCommand', (msg) => {
      if (!EXTENSION.activeEditorDocument) {
        return;
      }
      EXTENSION.activeEditorDocument.messageService.send(msg);
    });
    // Todo: move to document handling
    this.messages.on('updateElement', (msg) => {
      if (!EXTENSION.activeEditorDocument) {
        return;
      }
      EXTENSION.activeEditorDocument.applyEdit((document) => {
        const element = document.content.elements.find((e) => e.id === msg.id);
        if (!element) {
          throw new Error(
            `Tried to update element with id ${msg.id}, but it does not exist in the document`,
          );
        }
        if (deepEquals(msg.changes.data, element.data)) {
          console.log("Skipping updateElement message because the data hasn't changed");
          return false;
        }
        document.content.elements = document.content.elements.map((el) => {
          if (el.id !== msg.id) {
            return el;
          }

          return {
            ...el,
            data: {
              ...el.data,
              ...msg.changes.data,
            },
          };
        });
        return true;
      });
    });
  }

  dispose(): void {
    this.sync.dispose();
  }
}
