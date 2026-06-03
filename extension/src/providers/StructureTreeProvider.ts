import * as vscode from 'vscode';

export class StructureTreeProvider implements vscode.TreeDataProvider<StructureNode> {
  public static readonly VIEW_ID = '5board-vsc.sidebar-structure-view';

  constructor(private readonly context: vscode.ExtensionContext) {}

  getTreeItem(element: StructureNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: StructureNode): Thenable<StructureNode[]> {
    if (!element) {
      return Promise.resolve([
        new StructureNode('Page', true),
        new StructureNode('Header', true),
        new StructureNode('Content', true),
      ]);
    }

    return Promise.resolve([new StructureNode('Child A'), new StructureNode('Child B')]);
  }

  public register(): void {
    this.context.subscriptions.push(
      vscode.window.registerTreeDataProvider(StructureTreeProvider.VIEW_ID, this),
    );
  }
}

class StructureNode extends vscode.TreeItem {
  constructor(label: string, collapsible: boolean = false) {
    super(
      label,
      collapsible
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
    );
  }
}
