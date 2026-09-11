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
      this.sendProjectorState(sender);
    });

    // Pause/resume the projector: freezes all mirroring until resumed.
    this.messages.on('toggleProjectorPaused', () => {
      EXTENSION.projectorPaused = !EXTENSION.projectorPaused;
      this.sendProjectorState(); // sidebars (reflect the button)
      EXTENSION.activeEditorDocument?.broadcastProjectorState(); // editor + projector
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
    const open = EXTENSION.activeEditorDocument?.hasProjector ?? false;
    const paused = EXTENSION.projectorPaused;
    this.messages.send(
      {
        type: 'projectorStateChanged',
        active: EXTENSION.cursorTrackingEnabled && open && !paused,
        open,
        paused,
      },
      receiver,
    );
  }

  dispose(): void {
    this.sync.dispose();
  }
}
