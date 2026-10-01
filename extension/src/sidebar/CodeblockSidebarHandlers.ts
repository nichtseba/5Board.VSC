import vscode from 'vscode';
import { formatMessage, type BoardDocument } from '5board.vsc-common';
import { MessageService } from '../MessageService';
import { EXTENSION } from '../extension';
import { t } from '../localization';
import {
  createClass,
  deleteClass,
  moveBlock,
  updateClass,
  type ClassOpResult,
} from '../board/CodeblockSourceService';

/** Codeblock messages from the sidebars, applied to the active editor document. */
export function registerCodeblockSidebarHandlers(messages: MessageService): void {
  messages.on('moveBlock', (msg) => {
    editActiveDocument((document) => {
      moveBlock(document, msg.elementId, { className: msg.className, language: msg.language });
    });
  });

  messages.on('codeblockResetOutput', (msg) => {
    const document = EXTENSION.activeEditorDocument;
    if (document && !document.codeblock.resetOutput(msg.elementId)) {
      vscode.window.showInformationMessage(t('extension.codeblock.noOutputsToReset'));
    }
  });

  // Through the command, so the button gets the same confirmation dialog.
  messages.on('codeblockResetAllOutputs', () => {
    void vscode.commands.executeCommand('5board-vsc.resetAllOutputs');
  });

  messages.on('manageCodeClass', (msg) => {
    let result: ClassOpResult = 'unchanged';
    editActiveDocument((document) => {
      switch (msg.op) {
        case 'create':
          result = createClass(document, msg.name, msg.language);
          break;
        case 'update':
          result = updateClass(document, msg.name, msg.language, {
            newName: msg.newName,
            newLanguage: msg.newLanguage,
          });
          break;
        case 'delete':
          result = deleteClass(document, msg.name, msg.language);
          break;
      }
    });
    // manageCodeClass is fire-and-forget, so rejections surface as native notifications.
    showRejection(result, msg.newName ?? msg.name);
  });
}

function showRejection(result: ClassOpResult, name: string): void {
  if (result === 'name-taken') {
    vscode.window.showWarningMessage(
      formatMessage(t('extension.codeblock.classNameTaken'), { name }),
    );
  }
  if (result === 'not-empty') {
    vscode.window.showWarningMessage(t('extension.codeblock.deleteClassNotEmpty'));
  }
}

function editActiveDocument(edit: (document: BoardDocument) => void): void {
  const document = EXTENSION.activeEditorDocument;
  if (!document) return;
  document.applyEdit(edit);
  void document.saveDocument();
}
