import {
  BoardElement,
  EditorElement,
  EditorElementType,
  flattenBoardElements,
  getElementLayout,
  getElementSectionMap,
  getElementTypeDefinition,
  getNextRevealElement,
  getRevealSiblings,
  getRevealStepNumbers,
  isGroupElement,
  moveElementInRevealOrder,
  moveElementInSection,
  TranslationKey,
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
      // Reveal states are only shown while a projector is open.
      EXTENSION.onProjectorDocumentChange(() => this.didChangeTreeData.fire(undefined)),
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
    const revealContext: RevealContext = {
      stepNumbers: getRevealStepNumbers(elements),
      nextRevealId: getNextRevealElement(elements)?.id,
      presenting: document.hasProjector,
    };
    return elements
      .filter((candidate) => sectionById.get(candidate.id) === parentId)
      .map((candidate) => new StructureNode(candidate, revealContext));
  }

  handleDrag(source: readonly StructureNode[], dataTransfer: vscode.DataTransfer): void {
    if (source.length === 1) {
      dataTransfer.set(this.dragMimeTypes[0], new vscode.DataTransferItem(source[0].elementId));
    }
  }

  handleDrop(target: StructureNode | undefined, dataTransfer: vscode.DataTransfer): void {
    const sourceId = dataTransfer.get(this.dropMimeTypes[0])?.value;
    const document = EXTENSION.activeEditorDocument;
    if (typeof sourceId !== 'string' || !document) {
      return;
    }

    applyReorder(document, (elements) => getDropResult(elements, sourceId, target?.elementId));
  }

  /** Moves a structure item one step earlier (-1) or later (1) in the reveal order. */
  public moveItem(item: StructureNode | undefined, direction: -1 | 1): void {
    const document = EXTENSION.activeEditorDocument;
    if (!item || !document) {
      return;
    }

    applyReorder(document, (elements) =>
      moveElementInRevealOrder(elements, item.elementId, direction),
    );
  }

  public register(): void {
    this.context.subscriptions.push(
      vscode.window.createTreeView(StructureTreeProvider.VIEW_ID, {
        treeDataProvider: this,
        dragAndDropController: this,
      }),
      vscode.commands.registerCommand('5board-vsc.moveStructureItemUp', (item?: StructureNode) =>
        this.moveItem(item, -1),
      ),
      vscode.commands.registerCommand('5board-vsc.moveStructureItemDown', (item?: StructureNode) =>
        this.moveItem(item, 1),
      ),
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

/**
 * Resolves a drop in the structure view:
 * - onto a sibling: the source takes the target's place in the reveal order
 * - onto the heading of its own section: the source becomes the first of its section
 * - onto empty space: the source becomes the last of its section
 */
function getDropResult(
  elements: BoardElement[],
  sourceId: string,
  targetId: string | undefined,
): BoardElement[] | undefined {
  const siblings = getRevealSiblings(elements, sourceId);
  const sourceIndex = siblings.findIndex((candidate) => candidate.id === sourceId);
  if (sourceIndex < 0 || sourceId === targetId) {
    return undefined;
  }

  if (targetId === undefined) {
    return moveElementInSection(elements, sourceId, siblings[siblings.length - 1].id, 'after');
  }
  if (getElementSectionMap(elements).get(sourceId) === targetId) {
    return moveElementInSection(elements, sourceId, siblings[0].id, 'before');
  }

  const targetIndex = siblings.findIndex((candidate) => candidate.id === targetId);
  if (targetIndex < 0) {
    return undefined;
  }
  return moveElementInSection(
    elements,
    sourceId,
    targetId,
    sourceIndex < targetIndex ? 'after' : 'before',
  );
}

function applyReorder(
  document: BoardCustomDocument,
  reorder: (elements: BoardElement[]) => BoardElement[] | undefined,
): void {
  document.applyEdit((boardDocument) => {
    const elements = boardDocument.content.elements;
    const previousPositions = new Map(
      elements.map((candidate) => [candidate.id, getElementLayout(candidate).yPos]),
    );
    const reordered = reorder(elements);
    if (!reordered) {
      return false;
    }

    const changed =
      reordered.some((candidate, index) => candidate.id !== elements[index]?.id) ||
      reordered.some(
        (candidate) => previousPositions.get(candidate.id) !== getElementLayout(candidate).yPos,
      );
    if (!changed) {
      return false;
    }

    boardDocument.content.elements = reordered;
    return true;
  });
}

type RevealContext = {
  stepNumbers: ReadonlyMap<string, number>;
  nextRevealId: string | undefined;
  presenting: boolean;
};

type RevealState = 'speakerNote' | 'next' | 'revealed' | 'hidden';

class StructureNode extends vscode.TreeItem {
  public readonly elementId: string;

  constructor(element: BoardElement, reveal: RevealContext) {
    let label;
    let state;
    if (isHeadingElement(element)) {
      label = element.data.content;
      state = vscode.TreeItemCollapsibleState.Collapsed;
    } else {
      label = element.name ?? getDefaultLabel(element);
      state = vscode.TreeItemCollapsibleState.None;
    }
    super(label, state);
    this.elementId = element.id;
    this.id = element.id;
    this.contextValue = isHeadingElement(element) ? 'structureHeading' : 'structureElement';
    this.command = {
      title: t('webview.sidebar.goToElement'),
      command: '5board-vsc.goToElement',
      arguments: [element.id],
    };

    const leaves = flattenBoardElements([element]);
    const steps = leaves
      .map((leaf) => reveal.stepNumbers.get(leaf.id))
      .filter((step) => step !== undefined);
    const revealState = getRevealState(leaves, reveal.nextRevealId);
    const description =
      steps.length === 0
        ? t('webview.sidebar.structure.speakerNote')
        : steps.length === 1
          ? `#${steps[0]}`
          : `#${steps[0]}–${steps[steps.length - 1]}`;

    if (reveal.presenting) {
      this.description =
        revealState === 'next'
          ? `${description} · ${t('webview.sidebar.structure.nextReveal')}`
          : description;
      this.iconPath = REVEAL_STATE_ICONS[revealState];
      this.tooltip = `${label}\n${t(REVEAL_STATE_LABELS[revealState])}`;
    } else {
      this.description = description;
      this.iconPath = isGroupElement(element)
        ? new vscode.ThemeIcon('group-by-ref-type')
        : new vscode.ThemeIcon(getElementTypeDefinition(element.type).icon);
      this.tooltip = `${label}\n${t('webview.sidebar.structure.dropHint')}`;
    }
  }
}

const REVEAL_STATE_ICONS: Record<RevealState, vscode.ThemeIcon> = {
  speakerNote: new vscode.ThemeIcon('note', new vscode.ThemeColor('disabledForeground')),
  next: new vscode.ThemeIcon('debug-stackframe', new vscode.ThemeColor('charts.orange')),
  revealed: new vscode.ThemeIcon('eye', new vscode.ThemeColor('charts.green')),
  hidden: new vscode.ThemeIcon('eye-closed', new vscode.ThemeColor('disabledForeground')),
};

const REVEAL_STATE_LABELS: Record<RevealState, TranslationKey> = {
  speakerNote: 'webview.sidebar.structure.speakerNote',
  next: 'webview.sidebar.structure.nextReveal',
  revealed: 'webview.sidebar.structure.revealed',
  hidden: 'webview.sidebar.structure.hidden',
};

function getRevealState(leaves: EditorElement[], nextRevealId: string | undefined): RevealState {
  const steps = leaves.filter((leaf) => !leaf.display.speakerNote);
  if (steps.length === 0) {
    return 'speakerNote';
  }
  if (steps.some((leaf) => leaf.id === nextRevealId)) {
    return 'next';
  }
  return steps.every((leaf) => leaf.display.visible) ? 'revealed' : 'hidden';
}

function getDefaultLabel(element: BoardElement): string {
  if (isGroupElement(element)) {
    return t('webview.sidebar.elementType.group');
  }
  return t(getElementTypeDefinition(element.type).label as TranslationKey);
}

function isHeadingElement(el: BoardElement): el is EditorElement<EditorElementType.Heading> {
  return el.type === EditorElementType.Heading;
}

function isHeadingElementById(document: BoardCustomDocument, id: string): boolean {
  const element = document.boardPackage.document.content.elements.find(
    (candidate) => candidate.id === id,
  );
  return element ? isHeadingElement(element) : false;
}
