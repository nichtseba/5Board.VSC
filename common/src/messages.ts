import { BoardDocument } from './board/document';
import type { EditorElement } from './board/element';
import type { EditorTool } from './Editortools';
import { Language } from './localization';

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
  | { type: 'init'; document: BoardDocument; language: Language }
  | { type: 'cursorMove'; x: number; y: number }
  | { type: 'cursorHide' }
  | { type: 'cursorTrackingChanged'; enabled: boolean }
  | { type: 'scroll'; top: number; left: number }
  | { type: 'selectElement'; elementId: string | null }
  // Tells the editor which tool is active, including its parameters (e.g. freehand color/width).
  | { type: 'toolChanged'; tool: EditorTool }
  // Sent to the sidebar so it can reflect the current projector settings.
  | { type: 'sidebarSync'; cursorTrackingEnabled: boolean }
  // Live preview of an in-progress freehand stroke, mirrored to the projector.
  // Points are normalized (0–1) to the canvas, like the cursor position.
  | { type: 'freehandPreview'; points: { x: number; y: number }[]; color: string; width: number }
  | { type: 'freehandPreviewEnd' }
  | {
      type: 'viewportUpdate';
      viewport: { top: number; left: number; height: number; width: number };
    };

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
  | { type: 'focus' }
  | { type: 'cursorMove'; x: number; y: number }
  | { type: 'cursorLeave' }
  | { type: 'scroll'; top: number; left: number }
  | { type: 'selectElement'; elementId: string | null }
  | { type: 'toggleCursorTracking' }
  // Sent by the sidebar when the user picks a tool or changes its options.
  | { type: 'setTool'; tool: EditorTool }
  // Sent by the editor after drawing a new element (e.g. a freehand stroke).
  | { type: 'addElement'; element: EditorElement }
  // Live preview of the stroke the editor is currently drawing (normalized 0–1).
  | { type: 'freehandPreview'; points: { x: number; y: number }[]; color: string; width: number }
  | { type: 'freehandPreviewEnd' }
  | {
      type: 'updateViewport';
      viewport: { top: number; left: number; height: number; width: number };
    };
