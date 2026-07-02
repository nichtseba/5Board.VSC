import { EditorElement, EditorElementType } from '5board.vsc-common';
import * as vscode from 'vscode';
import { EXTENSION } from '../extension';
import { t } from '../localization';

export class StructureTreeProvider implements vscode.TreeDataProvider<StructureNode> {
  public static readonly VIEW_ID = '5board-vsc.sidebar-structure-view';

  public didChangeTreeData = new vscode.EventEmitter<undefined>();
  public readonly onDidChangeTreeData = this.didChangeTreeData.event;

  constructor(private readonly context: vscode.ExtensionContext) {
    EXTENSION.onActiveDocumentChange(() => {
      this.didChangeTreeData.fire(undefined);
    });
  }

  getTreeItem(element: StructureNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: StructureNode): Promise<StructureNode[]> {
    if (!EXTENSION.activeEditorDocument) {
      return [];
    }
    const elements = EXTENSION.activeEditorDocument.boardPackage.document.content.elements.slice();
    elements.sort((a, b) => a.layout.yPos - b.layout.yPos);
    let startIdx;
    let minLevel;
    if (!element) {
      startIdx = 0;
      minLevel = 0;
    } else {
      const editorElement = elements.find((el) => el.id === element.id);
      if (!editorElement || !isHeadingElement(editorElement)) {
        return [];
      }
      startIdx = elements.indexOf(editorElement) + 1;
      minLevel = editorElement.data.level;
    }
    let maxLevel = 7;
    const result: StructureNode[] = [];
    for (let i = startIdx; i < elements.length; i++) {
      const el = elements[i];
      let level;
      if (isHeadingElement(el)) {
        level = el.data.level;
      } else {
        level = 7;
      }
      if (level <= minLevel) {
        break;
      }
      if (level > maxLevel) {
        continue;
      }
      maxLevel = Math.min(maxLevel, level);
      result.push(new StructureNode(el));
    }
    return result;
  }

  public register(): void {
    this.context.subscriptions.push(
      vscode.window.registerTreeDataProvider(StructureTreeProvider.VIEW_ID, this),
    );
  }
}

class StructureNode extends vscode.TreeItem {
  constructor(element: EditorElement) {
    let label;
    let state;
    if (isHeadingElement(element)) {
      label = element.data.content;
      state = vscode.TreeItemCollapsibleState.Collapsed;
    } else {
      label = `${t(`webview.sidebar.elementType.${element.type}`)} ${element.id}`;
      state = vscode.TreeItemCollapsibleState.None;
    }
    super(label, state);
    this.id = element.id;
    this.command = {
      title: t('webview.sidebar.goToElement'),
      command: '5board-vsc.goToElement',
      arguments: [element.id],
    };
  }
}

function isHeadingElement(el: EditorElement): el is EditorElement<EditorElementType.Heading> {
  return el.type === EditorElementType.Heading;
}
