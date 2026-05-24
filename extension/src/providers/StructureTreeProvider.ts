import * as vscode from 'vscode';

export class StructureTreeProvider implements vscode.TreeDataProvider<StructureNode> {
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
