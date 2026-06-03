import { EditorElement } from './board/element';
import { Language } from './localization';
import { BoardDocument } from './board/document';

export type AppState = {
  selectedElementId: string | null;
};

// Messages FROM the extension TO webviews
export type ExtensionToWebviewMessage =
  | { type: 'init'; state: AppState; language: Language }
  | { type: 'updateContent'; state: AppState }
  | { type: 'fileLoaded'; content: string; fileName: string }
  | { type: 'statusUpdate'; status: string }
  | { type: 'error'; message: string }
  | { type: 'scrollToElementPreview'; id: string } //or position:number?
  | { type: 'visibleRangePreview'; startY: number; endY: number }
  | { type: 'updateDocument'; content: BoardDocument }; //todo: define type of document content

export type WebviewToExtensionMessageType = AllWebviewToExtensionMessage['type'];
export type WebviewToExtensionMessage<
  MessageType extends WebviewToExtensionMessageType = WebviewToExtensionMessageType,
> = Extract<AllWebviewToExtensionMessage, { type: MessageType }>;

// Messages FROM webviews TO the extension
type AllWebviewToExtensionMessage =
  | { type: 'ready' }
  | { type: 'runCode'; code: string }
  | { type: 'loadFile'; fileName: string }
  | { type: 'saveFile'; content: string; fileName: string }
  | { type: 'updateFile'; content: string; fileName: string }
  | { type: 'selectElement'; id: string | null }
  | { type: 'selectionChange'; selectedIds: string[] }
  | { type: 'updateElement'; id: string; changes: Partial<EditorElement> }
  | { type: 'changeElementContent'; id: string; content: string }
  | { type: 'changeElementType'; id: string; newType: EditorElement['type'] }
  | { type: 'moveElement'; id: string; xPos: number; yPos: number }
  | { type: 'deleteElement'; id: string }
  | { type: 'toggleElementVisibility'; id: string; visible: boolean } //todo: add field visible in definition of EditorElement
  | { type: 'addElement'; element: EditorElement }
  | { type: 'duplicateElement'; id: string }
  | { type: 'selectTool'; id: string }; //different handling of tools vs editorElements?
