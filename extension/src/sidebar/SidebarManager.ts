import vscode from 'vscode';
import { SidebarDocumentSync } from './SidebarDocumentSync';
import { MessageService } from '../MessageService';
import {
  ElementSettingsSidebarViewProvider,
  ProjectorSettingsSidebarViewProvider,
  SidebarViewProvider,
} from '../providers/SidebarViewProvider';
import { StructureTreeProvider } from '../providers/StructureTreeProvider';
import { EXTENSION } from '../extension';
import deepEquals from 'deep-equal';
import { FileTreeProvider } from '../providers/FileTreeProvider';

export class SidebarManager implements vscode.Disposable {
  private readonly sync: SidebarDocumentSync;

  constructor(
    context: vscode.ExtensionContext,
    private readonly messages: MessageService,
  ) {
    new SidebarViewProvider(context, messages).register();
    new ProjectorSettingsSidebarViewProvider(context, messages).register();
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

    this.messages.on('deleteElement', (msg) => {
      EXTENSION.deleteEditorElement(msg.id);
    });
    this.messages.on('deletePreset', async (msg) => {
      await EXTENSION.deletePreset(msg.id);
    });
    this.messages.on('revealPresetsFile', async () => {
      await EXTENSION.revealPresetsFile();
    });
    this.messages.on('textEditorCommand', (msg) => {
      if (!EXTENSION.activeEditorDocument) {
        return;
      }
      EXTENSION.activeEditorDocument.messageService.send(msg);
    });

    // Sync the current projector settings to a newly opened sidebar.
    this.messages.on('ready', (_msg, sender) => {
      this.messages.send(
        { type: 'cursorTrackingChanged', enabled: EXTENSION.cursorTrackingEnabled },
        sender,
      );
      this.messages.send(
        { type: 'projectorPointerChanged', style: EXTENSION.projectorPointerStyle },
        sender,
      );
    });

    // Toggle the global cursor tracking setting from the sidebar and notify every view.
    this.messages.on('toggleCursorTracking', () => {
      EXTENSION.cursorTrackingEnabled = !EXTENSION.cursorTrackingEnabled;
      const msg = {
        type: 'cursorTrackingChanged' as const,
        enabled: EXTENSION.cursorTrackingEnabled,
      };
      this.messages.send(msg); // sidebars (reflect the checkbox)
      // Editor + projector only care whether mirroring is now active.
      EXTENSION.activeEditorDocument?.broadcastProjectorState();
    });

    // Update the mirrored cursor appearance and notify every view.
    this.messages.on('updateProjectorPointer', (msg) => {
      EXTENSION.projectorPointerStyle = msg.style;
      const changed = {
        type: 'projectorPointerChanged' as const,
        style: EXTENSION.projectorPointerStyle,
      };
      this.messages.send(changed); // sidebars (reflect the controls)
      // Reach the projector via the active editor document's MessageService.
      EXTENSION.activeEditorDocument?.messageService.send(changed);
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
        const nextData = {
          ...element.data,
          ...msg.changes.data,
        };

        const nextLayout = {
          ...element.layout,
          ...msg.changes.layout,
        };

        const nextStyle = {
          ...element.style,
          ...msg.changes.style,
        };

        if (
          deepEquals(nextData, element.data) &&
          deepEquals(nextLayout, element.layout) &&
          deepEquals(nextStyle, element.style)
        ) {
          //Skipping updateElement message because the data hasn't changed
          return false;
        }

        document.content.elements = document.content.elements.map((el) => {
          if (el.id !== msg.id) {
            return el;
          }

          return {
            ...el,
            layout: {
              ...el.layout,
              ...msg.changes.layout,
            },
            data: {
              ...el.data,
              ...msg.changes.data,
            } as typeof el.data,
            style: {
              ...el.style,
              ...msg.changes.style,
            },
          };
        });
        return true;
      });
    });

    this.messages.on('addImageFromFile', async () => {
      await vscode.commands.executeCommand('5board-vsc.addImageFromFile');
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
        const headingSettings = document.content.headingSettings ?? {};
        const numberingFormats = headingSettings.numberingFormats ?? {};

        document.content.headingSettings = {
          ...headingSettings,
          numberingEnabled: msg.enabled ?? headingSettings.numberingEnabled,
          numberingFormats:
            msg.level && msg.numberingFormat
              ? {
                  ...numberingFormats,
                  [msg.level]: msg.numberingFormat,
                }
              : numberingFormats,
        };
      });
    });
  }

  dispose(): void {
    this.sync.dispose();
  }
}
