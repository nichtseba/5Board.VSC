import * as vscode from 'vscode';
import { EXTENSION } from '../extension';

export class FileTreeProvider implements vscode.TreeDataProvider<FileNode> {
  public static readonly VIEW_ID = '5board-vsc.sidebar-file-view';

  public didChangeTreeData = new vscode.EventEmitter<undefined>();
  public readonly onDidChangeTreeData = this.didChangeTreeData.event;

  constructor(private readonly context: vscode.ExtensionContext) {
    EXTENSION.onActiveDocumentChange(() => {
      this.didChangeTreeData.fire(undefined);
    });
  }

  getTreeItem(element: FileNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: FileNode): Promise<FileNode[]> {
    let uri;
    if (element) {
      uri = element.uri;
    } else {
      if (!EXTENSION.activeEditorDocument) {
        return [];
      }
      uri = EXTENSION.activeEditorDocument.uri.with({ scheme: '5board' });
      uri = uri.with({ path: uri.path + '/' });
    }
    const stat = await vscode.workspace.fs.stat(uri);
    if (stat.type === vscode.FileType.Directory) {
      const children = await vscode.workspace.fs.readDirectory(uri);
      return children.map(([name, type]) => {
        const childUri = vscode.Uri.joinPath(uri, name);
        return new FileNode(childUri, type);
      });
    } else {
      return [];
    }
  }

  public register(): void {
    this.context.subscriptions.push(
      vscode.window.registerTreeDataProvider(FileTreeProvider.VIEW_ID, this),
    );
  }
}

class FileNode extends vscode.TreeItem {
  constructor(
    public uri: vscode.Uri,
    type: vscode.FileType,
  ) {
    super(uri, FILETYPE_TO_COLLAPSIBLE[type]);
    if (type === vscode.FileType.File) {
      this.command = {
        command: 'vscode.open',
        title: 'Open File',
        arguments: [uri],
      };
    }
  }
}

const FILETYPE_TO_COLLAPSIBLE = {
  [vscode.FileType.Directory]: vscode.TreeItemCollapsibleState.Collapsed,
  [vscode.FileType.File]: vscode.TreeItemCollapsibleState.None,
  [vscode.FileType.SymbolicLink]: vscode.TreeItemCollapsibleState.None,
  [vscode.FileType.Unknown]: vscode.TreeItemCollapsibleState.None,
} as const satisfies Record<vscode.FileType, vscode.TreeItemCollapsibleState>;
