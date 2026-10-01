import {
  EditorElement,
  EditorElementType,
  getElementSectionMap,
  moveElementBeforeInSection,
  moveHeadingSectionBefore,
} from '5board.vsc-common';
import * as vscode from 'vscode';
import { EXTENSION } from '../extension';
import { t } from '../localization';
import { BoardCustomDocument } from '../board/BoardCustomDocument';

export class StructureTreeProvider
  implements vscode.TreeDataProvider<StructureNode>, vscode.TreeDragAndDropController<StructureNode>
{
  public static readonly VIEW_ID = '5board-vsc.sidebar-structure-view';
  public readonly dragMimeTypes = ['application/vnd.code.tree.5board-vsc.sidebar-structure-view'];
  public readonly dropMimeTypes = ['application/vnd.code.tree.5board-vsc.sidebar-structure-view'];

  public didChangeTreeData = new vscode.EventEmitter<undefined>();
  public readonly onDidChangeTreeData = this.didChangeTreeData.event;
  private activeDocumentListener?: vscode.Disposable;

  constructor(private readonly context: vscode.ExtensionContext) {
    context.subscriptions.push(
      this.didChangeTreeData,
      EXTENSION.onActiveDocumentChange((document) => this.watchDocument(document)),
      new vscode.Disposable(() => this.activeDocumentListener?.dispose()),
    );
    this.watchDocument(EXTENSION.activeEditorDocument);
  }

  getTreeItem(element: StructureNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: StructureNode): Promise<StructureNode[]> {
    const document = EXTENSION.activeEditorDocument;
    if (!document) {
      return [];
    }
    if (element && !isHeadingElementById(document, element.elementId)) {
      return [];
    }

    const elements = document.boardPackage.document.content.elements;
    const sectionById = getElementSectionMap(elements);
    const parentId = element?.elementId ?? null;
    return elements
      .filter((candidate) => sectionById.get(candidate.id) === parentId)
      .map((candidate) => new StructureNode(candidate));
  }

  handleDrag(source: readonly StructureNode[], dataTransfer: vscode.DataTransfer): void {
    if (source.length === 1) {
      dataTransfer.set(this.dragMimeTypes[0], new vscode.DataTransferItem(source[0].elementId));
    }
  }

  handleDrop(target: StructureNode | undefined, dataTransfer: vscode.DataTransfer): void {
    const sourceId = dataTransfer.get(this.dropMimeTypes[0])?.value;
    const document = EXTENSION.activeEditorDocument;
    if (typeof sourceId !== 'string' || !target || !document) {
      return;
    }

    document.applyEdit((boardDocument) => {
      const elements = boardDocument.content.elements;
      const source = elements.find((candidate) => candidate.id === sourceId);
      if (!source) {
        return false;
      }

      const previousPositions = new Map(
        elements.map((candidate) => [candidate.id, candidate.layout.yPos]),
      );
      const reordered = isHeadingElement(source)
        ? moveHeadingSectionBefore(elements, sourceId, target.elementId)
        : moveElementBeforeInSection(elements, sourceId, target.elementId);
      if (!reordered) {
        return false;
      }

      const changed =
        reordered.some((candidate, index) => candidate.id !== elements[index]?.id) ||
        reordered.some(
          (candidate) => previousPositions.get(candidate.id) !== candidate.layout.yPos,
        );
      if (!changed) {
        return false;
      }

      boardDocument.content.elements = reordered;
      return true;
    });
  }

  public register(): void {
    this.context.subscriptions.push(
      vscode.window.createTreeView(StructureTreeProvider.VIEW_ID, {
        treeDataProvider: this,
        dragAndDropController: this,
      }),
    );
  }

  private watchDocument(document: BoardCustomDocument | null): void {
    this.activeDocumentListener?.dispose();
    this.activeDocumentListener = document?.onDocumentChange(() => {
      this.didChangeTreeData.fire(undefined);
    });
    this.didChangeTreeData.fire(undefined);
  }
}

class StructureNode extends vscode.TreeItem {
  public readonly elementId: string;

  constructor(element: EditorElement) {
    let label;
    let state;
    if (isHeadingElement(element)) {
      label = element.data.content;
      state = vscode.TreeItemCollapsibleState.Collapsed;
    } else {
      label = element.name ?? element.id;
      state = vscode.TreeItemCollapsibleState.None;
    }
    super(label, state);
    this.elementId = element.id;
    this.id = element.id;
    if (!isHeadingElement(element)) {
      this.contextValue = 'structureElement';
    }
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

function isHeadingElementById(document: BoardCustomDocument, id: string): boolean {
  const element = document.boardPackage.document.content.elements.find(
    (candidate) => candidate.id === id,
  );
  return element ? isHeadingElement(element) : false;
}
