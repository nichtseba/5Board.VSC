import * as vscode from 'vscode';
import {
  WebviewToExtensionMessageType,
  type ExtensionToWebviewMessage,
  type WebviewToExtensionMessage,
} from '5board.vsc-common';

export class MessageService {
  private webviews = new Set<vscode.Webview>();

  private handlers: {
    [MessageType in WebviewToExtensionMessageType]?: Set<Handler<MessageType>>;
  } = {};

  /**
   * Registers a webview panel or view.
   * - Wires up onDidReceiveMessage
   * - Cleans up when the panel/view is disposed (via onDidDispose)
   * Does NOT return a Disposable — cleanup is handled internally.
   */
  /** Use for editor panels — stores file data sent to that panel on 'ready'. */
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
