import * as vscode from 'vscode';
import {
  WebviewToExtensionMessageType,
  type WebviewToExtensionMessage,
  type ExtensionToWebviewMessage,
} from '5board.vsc-common';

export class MessageService {
  private webviews = new Set<vscode.Webview>();

  private handlers: {
    [MessageType in WebviewToExtensionMessageType]?: Set<Handler<MessageType>>;
  } = {};

  /**
   * Registers a webview panel or view.
   */
  public registerView(view: vscode.WebviewView) {
    this.registerPanelOrView(view);
  }
  public registerPanel(view: vscode.WebviewPanel) {
    this.registerPanelOrView(view);
    view.onDidChangeViewState((e) => {
      this.handleMessage({ type: 'focus', focus: e.webviewPanel.active }, e.webviewPanel.webview);
    });
  }
  private registerPanelOrView(panel: vscode.WebviewPanel | vscode.WebviewView): void {
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
