import vscode from 'vscode';
import { SidebarDocumentSync } from './SidebarDocumentSync';
import { MessageService } from '../MessageService';
import {
  ElementSettingsSidebarViewProvider,
  SidebarViewProvider,
} from '../providers/SidebarViewProvider';
import { StructureTreeProvider } from '../providers/StructureTreeProvider';
import { EXTENSION } from '../extension';
import { FileTreeProvider } from '../providers/FileTreeProvider';

export class SidebarManager implements vscode.Disposable {
  private readonly sync: SidebarDocumentSync;

  constructor(
    context: vscode.ExtensionContext,
    private readonly messages: MessageService,
  ) {
    new SidebarViewProvider(context, messages).register();
    new ElementSettingsSidebarViewProvider(context, messages).register();
    new StructureTreeProvider(context).register();
    new FileTreeProvider(context).register();

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

    this.messages.on('updateHeadingLevelSettings', (msg) => {
      if (!EXTENSION.activeEditorDocument) {
        return;
      }

      EXTENSION.activeEditorDocument.applyEdit((document) => {
        const headingSettings = document.content.headingSettings ?? {};
        const levels = headingSettings.levels ?? {};
        const currentLevelSettings = levels[msg.level] ?? {};

        document.content.headingSettings = {
          ...headingSettings,
          levels: {
            ...levels,
            [msg.level]: {
              ...currentLevelSettings,
              ...msg.changes,
              textDecoration: {
                ...currentLevelSettings.textDecoration,
                ...msg.changes.textDecoration,
              },
            },
          },
        };
      });
    });

    this.messages.on('updateHeadingNumbering', (msg) => {
      if (!EXTENSION.activeEditorDocument) {
        return;
      }

      EXTENSION.activeEditorDocument.applyEdit((document) => {
        document.content.headingSettings = {
          ...document.content.headingSettings,
          numberingFormat: msg.numberingFormat,
        };
      });
    });
  }

  dispose(): void {
    this.sync.dispose();
  }
}
