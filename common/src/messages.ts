import { BoardDocument } from './board/document';
import { HeadingLevel, HeadingLevelSettings, HeadingNumberingStyle } from './board/headingSettings';
import { Language } from './localization';
import { EditorElement, EditorState, EditorTool, ElementLayout, LineStyle } from './main';
import { ProjectorPointerStyle } from './projector';

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
  | { type: 'cursorMove'; x: number; y: number }
  | { type: 'cursorHide' }
  | { type: 'cursorTrackingChanged'; enabled: boolean }
  | { type: 'projectorStateChanged'; active: boolean; open: boolean }
  | { type: 'projectorPointerChanged'; style: ProjectorPointerStyle }
  | { type: 'scroll'; top: number; left: number }
  | { type: 'selectElement'; elementId: string | null }
  // Live preview of an in-progress freehand stroke, mirrored to the projector.
  // Points are normalized (0–1) to the canvas, like the cursor position.
  | {
      type: 'freehandPreview';
      points: { x: number; y: number }[];
      color: string;
      width: number;
      opacity: number;
      lineStyle: LineStyle;
      dashScale: number;
      straight: boolean;
    }
  | { type: 'freehandPreviewEnd' }
  | {
      type: 'viewportUpdate';
      viewport: { top: number; left: number; height: number; width: number };
    }
  | { type: 'updateEditorState'; editorState: EditorState }
  | { type: 'goToElement'; elementId: string };

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
  | { type: 'cursorMove'; x: number; y: number }
  | { type: 'cursorLeave' }
  | { type: 'scroll'; top: number; left: number }
  | { type: 'selectElement'; id: string | null }
  | { type: 'toggleElementSelection'; id: string }
  | { type: 'selectTool'; tool: EditorTool }
  | { type: 'insertSpacerRows'; startRow: number; rowCount: number }
  | { type: 'updateElementLayout'; id: string; changes: Partial<ElementLayout> } // Update the Layout when Element was moved or resized
  | { type: 'updateElement'; id: string; changes: Partial<EditorElement> } // Update element with it's settings
  | { type: 'toggleCursorTracking' }
  | { type: 'updateProjectorPointer'; style: ProjectorPointerStyle }
  // Sent by the editor after drawing a new element (e.g. a freehand stroke).
  | { type: 'addElement'; element: EditorElement }
  // Live preview of the stroke the editor is currently drawing (normalized 0–1).
  | {
      type: 'freehandPreview';
      points: { x: number; y: number }[];
      color: string;
      width: number;
      opacity: number;
      lineStyle: LineStyle;
      dashScale: number;
      straight: boolean;
    }
  | { type: 'freehandPreviewEnd' }
  | {
      type: 'updateViewport';
      viewport: { top: number; left: number; height: number; width: number };
    }
  | {
      type: 'updateHeadingLevelSettings';
      level: HeadingLevel;
      changes: HeadingLevelSettings;
    }
  | {
      type: 'updateHeadingNumbering';
      enabled?: boolean;
      level?: HeadingLevel;
      numberingFormat?: HeadingNumberingStyle;
    };
