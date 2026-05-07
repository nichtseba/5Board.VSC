import * as vscode from 'vscode';

export class StructureTreeProvider implements vscode.TreeDataProvider<any> {
  getTreeItem(element: any): vscode.TreeItem {
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

  private getActiveDocument(): vscode.TextDocument | undefined {
    return vscode.window.activeTextEditor?.document;
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
