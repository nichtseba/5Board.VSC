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
import { EditorElement } from '5board.vsc-common';

export class SidebarManager implements vscode.Disposable {
  private readonly sync: SidebarDocumentSync;
  private readonly projectorDocumentListener: vscode.Disposable;

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

    // Push projector attach/detach to the sidebars (their own MessageService).
    this.projectorDocumentListener = EXTENSION.onProjectorDocumentChange(() =>
      this.sendProjectorState(),
    );

    this.registerMessageHandlers();
  }

  private registerMessageHandlers(): void {
    this.messages.on('selectTool', (msg) => {
      EXTENSION.editorState = {
        tool: msg.tool,
      };
    });

    this.messages.on('deleteElements', (msg) => {
      msg.ids.forEach((id) => {
        EXTENSION.deleteEditorElement(id);
      });
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
      const settings = EXTENSION.settingsService.getSettings();

      this.messages.send(
        {
          type: 'settingsChanged',
          settings: {
            colorPalette: settings.colorPalette,
          },
        },
        sender,
      );
      this.sendProjectorState(sender);
    });

    // Pause/resume the projector: freezes all mirroring until resumed.
    this.messages.on('toggleProjectorPaused', () => {
      // No projector attached: nothing to pause.
      if (!EXTENSION.projectorDocument) return;
      EXTENSION.projectorPaused = !EXTENSION.projectorPaused;
      this.sendProjectorState(); // sidebars (reflect the button)
      EXTENSION.projectorDocument.broadcastProjectorState(); // editor + projector
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
      EXTENSION.projectorDocument?.broadcastProjectorState();
    });

    // Update the mirrored cursor appearance and notify every view.
    this.messages.on('updateProjectorPointer', (msg) => {
      EXTENSION.projectorPointerStyle = msg.style;
      const changed = {
        type: 'projectorPointerChanged' as const,
        style: EXTENSION.projectorPointerStyle,
      };
      this.messages.send(changed); // sidebars (reflect the controls)
      // Reach the projector via the document it's attached to.
      EXTENSION.projectorDocument?.messageService.send(changed);
    });

    // Todo: move to document handling
    this.messages.on('updateElements', (msg) => {
      if (!EXTENSION.activeEditorDocument) {
        return;
      }
      EXTENSION.activeEditorDocument.applyEdit((document) => {
        let changed = false;

        for (const update of msg.changes) {
          const elementIndex = document.content.elements.findIndex((e) => e.id === update.id);
          const element = document.content.elements[elementIndex];
          if (!element) {
            continue; // Todo: Warn here, something has gone wrong
          }
          const nextElement: EditorElement = Object.assign({}, element, update.changes);

          if (deepEquals(nextElement, element)) {
            //Skipping updateElement message because the data hasn't changed
            continue;
          }
          document.content.elements[elementIndex] = nextElement;
          changed = true;
        }
        return changed;
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

  /** Mirror the projector state to the sidebars (they live on a different MessageService). */
  private sendProjectorState(receiver?: vscode.Webview): void {
    const state = EXTENSION.projectorDocument?.projectorState ?? {
      type: 'projectorStateChanged' as const,
      active: false,
      open: false,
      paused: EXTENSION.projectorPaused,
    };
    this.messages.send(state, receiver);
  }

  dispose(): void {
    this.sync.dispose();
    this.projectorDocumentListener.dispose();
  }
}
