import vscode from 'vscode';
import { SidebarDocumentSync } from './SidebarDocumentSync';
import { MessageService } from '../MessageService';
import {
  ClassSettingsSidebarViewProvider,
  ElementSettingsSidebarViewProvider,
  ProjectorSettingsSidebarViewProvider,
  SidebarViewProvider,
} from '../providers/SidebarViewProvider';
import { StructureTreeProvider } from '../providers/StructureTreeProvider';
import { EXTENSION } from '../extension';
import { FileTreeProvider } from '../providers/FileTreeProvider';
import { createClass, deleteClass, moveBlock, renameClass } from '../board/CodeblockService';
import type { BoardDocument } from '5board.vsc-common';

export class SidebarManager implements vscode.Disposable {
  private readonly sync: SidebarDocumentSync;

  constructor(
    context: vscode.ExtensionContext,
    private readonly messages: MessageService,
  ) {
    new SidebarViewProvider(context, messages).register();
    new ProjectorSettingsSidebarViewProvider(context, messages).register();
    new ElementSettingsSidebarViewProvider(context, messages).register();
    new ClassSettingsSidebarViewProvider(context, messages).register();
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

    this.messages.on('moveBlock', (msg) => {
      this.editActiveDocument((document) => {
        moveBlock(document, msg.elementId, { className: msg.className, language: msg.language });
      });
    });

    this.messages.on('manageCodeClass', (msg) => {
      this.editActiveDocument((document) => {
        switch (msg.op) {
          case 'create':
            createClass(document, msg.name, msg.language);
            break;
          case 'rename':
            if (msg.newName) renameClass(document, msg.name, msg.newName, msg.language);
            break;
          case 'delete':
            deleteClass(document, msg.name, msg.language);
            break;
        }
      });
    });
  }

  /** Applies a CodeblockService edit to the active editor document and persists it. */
  private editActiveDocument(edit: (document: BoardDocument) => void): void {
    const doc = EXTENSION.activeEditorDocument;
    if (!doc) return;
    doc.applyEdit(edit);
    void doc.saveDocument();
  }

  dispose(): void {
    this.sync.dispose();
  }
}
