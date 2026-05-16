import * as vscode from 'vscode';
import type {
  AppState,
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
} from '5board.vsc-common';

type EditorData = { content: string; fileName: string };

export class MessageService {
  private webviews = new Set<vscode.Webview>();
  private editorData = new Map<vscode.Webview, EditorData>();
  private state: AppState = { counter: 0, selectedElementId: null };
  private onStateChange?: (state: AppState) => void;

  setOnStateChange(cb: (state: AppState) => void): void {
    this.onStateChange = cb;
  }

  /**
   * Registers a webview panel or view.
   * - Wires up onDidReceiveMessage
   * - Cleans up when the panel/view is disposed (via onDidDispose)
   * Does NOT return a Disposable — cleanup is handled internally.
   */
  /** Use for editor panels — stores file data sent to that panel on 'ready'. */
  registerEditor(panel: vscode.WebviewPanel, data: EditorData): void {
    this.editorData.set(panel.webview, data);
    this.register(panel);
  }

  register(panel: vscode.WebviewPanel | vscode.WebviewView): void {
    this.webviews.add(panel.webview);

    panel.webview.onDidReceiveMessage((msg: WebviewToExtensionMessage) => {
      this.handleMessage(msg, panel.webview);
    });

    if ('onDidDispose' in panel) {
      panel.onDidDispose(() => {
        this.webviews.delete(panel.webview);
        this.editorData.delete(panel.webview);
      });
    }
  }

  private handleMessage(msg: WebviewToExtensionMessage, sender?: vscode.Webview): void {
    switch (msg.type) {
      case 'ready':
        sender?.postMessage({
          type: 'init',
          state: this.state,
        } satisfies ExtensionToWebviewMessage);
        if (sender) {
          const data = this.editorData.get(sender);
          if (data) {
            sender.postMessage({ type: 'fileLoaded', ...data } satisfies ExtensionToWebviewMessage);
          }
        }
        break;
      case 'counterIncrement':
        this.state = { ...this.state, counter: this.state.counter + 1 };
        this.broadcast({ type: 'updateContent', state: this.state });
        this.onStateChange?.(this.state);
        break;
      case 'counterDecrement':
        this.state = { ...this.state, counter: this.state.counter - 1 };
        this.broadcast({ type: 'updateContent', state: this.state });
        this.onStateChange?.(this.state);
        break;
      case 'selectElement':
        this.state = { ...this.state, selectedElementId: msg.id };
        this.broadcast({ type: 'updateContent', state: this.state });
        this.onStateChange?.(this.state);
        break;
      case 'runCode':
        this.broadcast({ type: 'statusUpdate', status: `Running: ${msg.code}` });
        break;
    }
  }

  /** Trigger a message from outside (e.g. a toolbar command) as if a webview had sent it. */
  dispatch(msg: WebviewToExtensionMessage): void {
    this.handleMessage(msg);
  }

  broadcast(msg: ExtensionToWebviewMessage): void {
    for (const webview of this.webviews) {
      webview.postMessage(msg);
    }
  }
}
