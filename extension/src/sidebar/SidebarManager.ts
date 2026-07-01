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
import {
  EditorElementType,
  fileNameFromClassName,
  buildSource,
  isDefaultClassName,
  sanitizeClassName,
  extractBlock,
  COMMENT_PREFIX_BY_LANGUAGE,
  type CodeElementData,
} from '5board.vsc-common';

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

    this.messages.on('updateCodeBlockClass', (msg) => {
      this.updateCodeBlockClass(msg.elementId, msg.className);
    });
  }

  private updateCodeBlockClass(elementId: string, rawClassName: string): void {
    const doc = EXTENSION.activeEditorDocument;
    if (!doc) return;

    const element = doc.boardPackage.document.content.elements.find((e) => e.id === elementId);
    if (!element || element.type !== EditorElementType.Code) return;

    const oldData = element.data as CodeElementData;
    const newClassName = rawClassName.trim()
      ? sanitizeClassName(rawClassName.trim())
      : sanitizeClassName(elementId);

    if (newClassName === oldData.className) return;

    const { language } = oldData;
    const oldFileName = fileNameFromClassName(oldData.className, language);
    const prefix = COMMENT_PREFIX_BY_LANGUAGE[language] ?? '//';

    doc.applyEdit((document) => {
      const sourceIndex = document.sources.findIndex(
        (s) => s.name === oldFileName && s.language === language,
      );

      if (sourceIndex !== -1) {
        const oldSource = document.sources[sourceIndex];
        const code = extractBlock(oldSource.code, elementId, prefix) ?? '';
        const mainWrap = isDefaultClassName(newClassName, elementId);
        const newCode = buildSource({
          elementId,
          className: newClassName,
          language,
          code,
          mainWrap,
        });
        const newFileName = fileNameFromClassName(newClassName, language);

        document.sources[sourceIndex] = {
          ...oldSource,
          name: newFileName,
          code: newCode,
          modifiedAt: Date.now(),
        };
      }

      const el = document.content.elements.find((e) => e.id === elementId)!;
      (el.data as CodeElementData).className = newClassName;
    });

    void doc.saveDocument();
  }

  dispose(): void {
    this.sync.dispose();
  }
}
