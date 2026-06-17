import {
  ArrowElementData,
  BoardContent,
  EditorElement,
  EditorElementType,
} from '5board.vsc-common';
import * as vscode from 'vscode';
import { EXTENSION } from '../extension';

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
    if (element) {
      return element.children;
    }
    const doc = EXTENSION.activeEditorDocument;
    if (!doc) {
      return [];
    }
    return this.getRoot(doc.boardPackage.document.content);
  }

  private getRoot(content: BoardContent) {
    const headingElements = content.elements.filter(
      (el): el is EditorElement<EditorElementType.Heading> => el.type === EditorElementType.Heading,
    );
    return this.getWithLevel(headingElements, 1);
  }

  private getWithLevel(elements: EditorElement<EditorElementType.Heading>[], level: number) {
    let remainingElements = elements;
    let currentElement = null;
    while (remainingElements.length > 0) {
      let nextElementIdx = remainingElements.findIndex((el) => el.data.level === level);
      if (nextElementIdx === -1) {
        nextElementIdx = remainingElements.length;
      }
      let potentialChildren = remainingElements.slice(0, nextElementIdx);
      remainingElements = remainingElements.slice(nextElementIdx);
      let children;
      if (potentialChildren.length > 0 && level < 6) {
        children = this.getWithLevel(potentialChildren, level + 1);
      } else {
        children = [];
      }
    }
  }

  public register(): void {
    this.context.subscriptions.push(
      vscode.window.registerTreeDataProvider(StructureTreeProvider.VIEW_ID, this),
    );
  }
}

class StructureNode extends vscode.TreeItem {
  constructor(
    element: EditorElement<EditorElementType.Heading> | null,
    public readonly children: StructureNode[],
  ) {
    const collapsible =
      element && element.data.level < 6
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None;
    super(element ? element.data.content : '', collapsible);
    this.id = element ? element.id : undefined;
  }
}
