import { BoardDocument } from './board/document';
import { Language } from './localization';
import { EditorElement, EditorElementType, EditorState, EditorTool, ElementLayout } from './main';

/**
 * Messages from the extension to webviews
 * This is a utility type that allows specifing the type of the message and getting the corresponding content type
 * Add message types to {@link AllExtensionToWebviewMessage}
 */
export type ExtensionToWebviewMessage<
  MessageType extends ExtensionToWebviewMessageType = ExtensionToWebviewMessageType,
> = Extract<AllExtensionToWebviewMessage, { type: MessageType }>;
export type ExtensionToWebviewMessageType = AllExtensionToWebviewMessage['type'];

// All Messages from the extension to webviews
type AllExtensionToWebviewMessage =
  | { type: 'updateDocument'; document: BoardDocument }
  | { type: 'init'; document: BoardDocument; editorState: EditorState; language: Language }
  | { type: 'updateEditorState'; editorState: EditorState };

/**
 * Messages from the webviews to the extension
 * This is a utility type that allows specifing the type of the message and getting the corresponding content type
 * Add message types to {@link AllWebviewToExtensionMessage}
 */
export type WebviewToExtensionMessage<
  MessageType extends WebviewToExtensionMessageType = WebviewToExtensionMessageType,
> = Extract<AllWebviewToExtensionMessage, { type: MessageType }>;
export type WebviewToExtensionMessageType = AllWebviewToExtensionMessage['type'];

// All Messages from webviews to the extension
type AllWebviewToExtensionMessage =
  | { type: 'ready' }
  | { type: 'focus'; focus: boolean }
  | { type: 'selectElement'; id: string | null }
  | { type: 'selectTool'; tool: EditorTool }
  | { type: 'insertSpacerRows'; startRow: number; rowCount: number }
  | { type: 'addElement'; elementType: EditorElementType }
  | { type: 'deleteElement'; id: string }
  | { type: 'updateElementLayout'; id: string; changes: Partial<ElementLayout> } // Update the Layout when Element was moved or resized
  | { type: 'updateElement'; id: string; changes: Partial<EditorElement> }; // Update element with it's settings
