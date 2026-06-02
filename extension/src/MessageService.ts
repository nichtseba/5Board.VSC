import * as vscode from 'vscode';
import {
  normalizeLanguage,
  type AppState,
  type EditorElement,
  type ExtensionToWebviewMessage,
  type WebviewToExtensionMessage,
} from '5board.vsc-common';

type EditorData = { content: string; fileName: string };

export class MessageService {
  private webviews = new Set<vscode.Webview>();
  private editorData = new Map<vscode.Webview, EditorData>();
  private state: AppState = {
    selectedElementId: null,
  };
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
        this.handleReady(sender);
        break;
      case 'selectElement':
        this.handleSelectElement(msg);
        break;
      case 'runCode':
        this.handleRunCode(msg);
        break;
      case 'scroll':
        this.handleScroll(msg);
        break;
      case 'loadFile':
        this.handleLoadFile(msg);
        break;
      case 'saveFile':
        this.handleSaveFile(msg);
        break;
      case 'updateFile':
        this.handleUpdateFile(msg);
        break;
      case 'selectionChange':
        this.handleSelectionChange(msg);
        break;
      case 'updateElement':
        this.handleUpdateElement(msg);
        break;
      case 'changeElementContent':
        this.handleChangeElementContent(msg);
        break;
      case 'changeElementType':
        this.handleChangeElementType(msg);
        break;
      case 'moveElement':
        this.handleMoveElement(msg);
        break;
      case 'deleteElement':
        this.handleDeleteElement(msg);
        break;
      case 'toggleElementVisibility':
        this.handleToggleElementVisibility(msg);
        break;
      case 'addElement':
        this.handleAddElement(msg);
        break;
      case 'duplicateElement':
        this.handleDuplicateElement(msg);
        break;
      case 'selectTool':
        this.handleSelectTool(msg);
        break;
      case 'cursorMove':
        this.broadcast({ type: 'cursorUpdate', x: msg.x, y: msg.y });
        break;
      default:
        console.warn('Unhandled webview message', msg);
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

  //message handlers for messages from webviews to extension (called in handleMessage):

  /**
   * Handles the 'ready' message from a webview.
   * @param sender The webview that sent the message.
   */
  private handleReady(sender?: vscode.Webview): void {
    sender?.postMessage({
      type: 'init',
      state: this.state,
      language: normalizeLanguage(vscode.env.language),
    } satisfies ExtensionToWebviewMessage);
    if (sender) {
      const data = this.editorData.get(sender);
      if (data) {
        sender.postMessage({ type: 'fileLoaded', ...data } satisfies ExtensionToWebviewMessage);
      }
    }
  }

  /**
   * Handles the 'selectElement' message, updating the selected element ID and broadcasting the change.
   * @param msg The message containing the ID of the selected element.
   */
  private handleSelectElement(msg: { type: 'selectElement'; id: string | null }): void {
    this.state = { ...this.state, selectedElementId: msg.id };
    this.broadcast({ type: 'updateContent', state: this.state });
    this.onStateChange?.(this.state);
  }

  /**
   * Handles the 'runCode' message, broadcasting the status update.
   * @param msg The message containing the code to run.
   */
  private handleRunCode(msg: { type: 'runCode'; code: string }): void {
    this.broadcast({ type: 'statusUpdate', status: `Running: ${msg.code}` });
  }

  /**
   * Handles the 'scroll' message, broadcasting the vertical and horizontal scroll position.
   * @param msg The message containing the scroll position.
   */
  private handleScroll(msg: { type: 'scroll'; top: number; left: number }): void {
    this.broadcast({ type: 'scrollUpdate', top: msg.top, left: msg.left });
  }

  private handleLoadFile(_msg: { type: 'loadFile'; fileName: string }): void {
    //todo: implement file loading logic, e.g. read file content and send back to webview
  }

  private handleSaveFile(_msg: { type: 'saveFile'; content: string; fileName: string }): void {
    //todo: implement file saving logic, e.g. write content to file system
  }

  private handleUpdateFile(_msg: { type: 'updateFile'; content: string; fileName: string }): void {
    //todo: implement file updating logic, e.g. write updated content to file system
  }

  private handleSelectionChange(_msg: { type: 'selectionChange'; selectedIds: string[] }): void {
    //todo: implement selection change logic, e.g. update state with selected element IDs and broadcast changes
  }

  private handleUpdateElement(_msg: {
    type: 'updateElement';
    id: string;
    changes: Partial<EditorElement>;
  }): void {
    //todo: implement element update logic, e.g. find element by ID, apply changes, update state and broadcast changes
  }

  private handleChangeElementContent(_msg: {
    type: 'changeElementContent';
    id: string;
    content: string;
  }): void {
    //todo: implement element content change logic, e.g. find element by ID, update content, update state and broadcast changes
  }

  private handleChangeElementType(_msg: {
    type: 'changeElementType';
    id: string;
    newType: EditorElement['type'];
  }): void {
    //todo: implement element type change logic, e.g. find element by ID, update type, update state and broadcast changes
  }

  private handleMoveElement(_msg: {
    type: 'moveElement';
    id: string;
    xPos: number;
    yPos: number;
  }): void {
    //todo: implement element move logic, e.g. find element by ID, update position, update state and broadcast changes
  }

  private handleDeleteElement(_msg: { type: 'deleteElement'; id: string }): void {
    //todo: implement element deletion logic, e.g. find element by ID, remove from state, update state and broadcast changes
  }

  private handleToggleElementVisibility(_msg: {
    type: 'toggleElementVisibility';
    id: string;
    visible: boolean;
  }): void {
    //todo: implement element visibility toggle logic, e.g. find element by ID, update visibility, update state and broadcast changes
  }

  private handleAddElement(_msg: { type: 'addElement'; element: EditorElement }): void {
    //todo: implement element addition logic, e.g. add element to state, update state and broadcast changes
  }

  private handleDuplicateElement(_msg: { type: 'duplicateElement'; id: string }): void {
    //todo: implement element duplication logic, e.g. find element by ID, create copy with new ID, add to state, update state and broadcast changes
  }

  private handleSelectTool(_msg: { type: 'selectTool'; id: string }): void {
    //todo: implement tool selection logic, e.g. update state with selected tool ID and broadcast changes
  }
}
