import * as vscode from 'vscode';
import {
  WebviewToExtensionMessageType,
  type WebviewToExtensionMessage,
  type ExtensionToWebviewMessage,
} from '5board.vsc-common';

export class MessageService {
  private webviews = new Set<vscode.Webview>();
  private latestHtmlExport?: { html: string; fileName?: string };

  private handlers: {
    [MessageType in WebviewToExtensionMessageType]?: Set<Handler<MessageType>>;
  } = {};

  /**
   * Registers a webview panel or view.
   */
  registerPanel(panel: vscode.WebviewPanel): void {
    this.webviews.add(panel.webview);
    panel.webview.onDidReceiveMessage((msg) => this.handleMessage(msg, panel.webview));
    panel.onDidDispose(() => {
      this.webviews.delete(panel.webview);
    });
  }

  private handleMessage<MessageType extends WebviewToExtensionMessageType>(
    msg: WebviewToExtensionMessage<MessageType>,
    sender: vscode.Webview,
  ): void {
    if (msg.type === 'htmlExportPreviewGenerated') {
      const exportMessage = msg as WebviewToExtensionMessage<'htmlExportPreviewGenerated'>;
      this.latestHtmlExport = { html: exportMessage.html, fileName: exportMessage.fileName };
    }

    const handlers: Set<Handler<MessageType>> | undefined = this.handlers[msg.type];
    if (handlers) {
      for (const handler of handlers) {
        handler(msg, sender);
      }
    }
  }

  public send(msg: ExtensionToWebviewMessage, receiver?: vscode.Webview): void {
    const receivers = receiver ? [receiver] : Array.from(this.webviews);
    for (const webview of receivers) {
      webview.postMessage(msg);
    }
  }

  // writes the latest generated HTML export to the selected file
  async saveLatestHtmlExport(): Promise<void> {
    if (!this.latestHtmlExport) {
      vscode.window.showErrorMessage('No HTML export preview available.');
      return;
    }

    const targetUri = await vscode.window.showSaveDialog({
      filters: {
        HTML: ['html', 'htm'],
      },
      saveLabel: 'Save HTML Export',
    });

    if (!targetUri) {
      return;
    }

    await vscode.workspace.fs.writeFile(
      targetUri,
      new TextEncoder().encode(this.latestHtmlExport.html),
    );

    vscode.window.showInformationMessage(`HTML export saved: ${targetUri.fsPath}`);
  }

  /**
   * Registers a handler for a specific message type.
   * Returns an unsubscribe function to remove the handler.
   */
  public on<MessageType extends WebviewToExtensionMessageType>(
    type: MessageType,
    handler: Handler<MessageType>,
  ): Unsubscribe {
    if (!this.handlers[type]) {
      (this.handlers[type] as Set<Handler<MessageType>> | undefined) = new Set();
    }
    this.handlers[type]!.add(handler);
    return () => {
      this.handlers[type]!.delete(handler);
    };
  }
}

type Handler<MessageType extends WebviewToExtensionMessageType> = (
  msg: WebviewToExtensionMessage<MessageType>,
  sender: vscode.Webview,
) => void;

type Unsubscribe = () => void;
