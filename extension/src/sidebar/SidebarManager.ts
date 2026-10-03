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
import { getElementSectionMap, reconcileElementRevealOrder } from '5board.vsc-common';

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
    this.messages.on('deletePreset', async (msg) => {
      await EXTENSION.deletePreset(msg.id);
    });
    this.messages.on('loadPresetAsset', async (msg) => {
      await EXTENSION.loadPresetAsset(msg.id);
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

    this.messages.on('setAllElementsVisible', (msg) => {
      const command = msg.visible ? '5board-vsc.revealAll' : '5board-vsc.hideAll';
      void vscode.commands.executeCommand(command);
    });
    this.messages.on('revealNext', () => {
      void vscode.commands.executeCommand('5board-vsc.revealNext');
    });
    this.messages.on('unrevealNext', () => {
      void vscode.commands.executeCommand('5board-vsc.unrevealNext');
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
        const previousSections = getElementSectionMap(document.content.elements);
        let changed = false;

        for (const update of msg.changes) {
          const elementIndex = document.content.elements.findIndex((e) => e.id === update.id);
          const element = document.content.elements[elementIndex];
          if (!element) {
            continue; // Todo: Warn here, something has gone wrong
          }
          const nextData = {
            ...element.data,
            ...update.changes.data,
          };
          const nextLayout = {
            ...element.layout,
            ...update.changes.layout,
          };
          const nextStyle = {
            ...element.style,
            ...update.changes.style,
          };
          const nextDisplay = {
            ...element.display,
            ...update.changes.display,
          };
          if (update.changes.style?.backgroundColor === undefined) {
            delete nextStyle.backgroundColor;
          }

          if (
            deepEquals(nextData, element.data) &&
            deepEquals(nextLayout, element.layout) &&
            deepEquals(nextStyle, element.style) &&
            deepEquals(nextDisplay, element.display)
          ) {
            //Skipping updateElement message because the data hasn't changed
            continue;
          }

          document.content.elements = document.content.elements.map((el) => {
            if (el.id !== update.id) {
              return el;
            }

            return {
              ...el,
              layout: {
                ...el.layout,
                ...update.changes.layout,
              },
              data: {
                ...el.data,
                ...update.changes.data,
              } as typeof el.data,
              style: nextStyle,
              display: nextDisplay,
            };
          });
          changed = true;
        }
        if (changed) {
          document.content.elements = reconcileElementRevealOrder(
            document.content.elements,
            previousSections,
          );
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

        const nextLevelSettings = {
          ...currentLevelSettings,
          ...msg.changes,
          textDecoration: {
            ...currentLevelSettings.textDecoration,
            ...msg.changes.textDecoration,
          },
        };

        const clearsBackgroundColor =
          Object.prototype.hasOwnProperty.call(msg.changes, 'backgroundColor') &&
          msg.changes.backgroundColor === undefined;

        const cleanedLevelSettings = clearsBackgroundColor
          ? removeBackgroundColor(nextLevelSettings)
          : nextLevelSettings;

        document.content.headingSettings = {
          ...headingSettings,
          levels: {
            ...levels,
            [msg.level]: cleanedLevelSettings,
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

function removeBackgroundColor<T extends { backgroundColor?: string }>(
  value: T,
): Omit<T, 'backgroundColor'> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== 'backgroundColor'),
  ) as Omit<T, 'backgroundColor'>;
}
