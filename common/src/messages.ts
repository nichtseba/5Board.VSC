import { BoardDocument } from './board/document';
import { HeadingLevel, HeadingLevelSettings, HeadingNumberingStyle } from './board/headingSettings';
import { Language } from './localization';
import {
  EditorElement,
  EditorElementType,
  EditorState,
  EditorTool,
  ElementLayout,
  AddElementDefaults,
  LineStyle,
  TextEditorCommand,
} from './main';
import { ProjectorPointerStyle } from './projector';
import { WebviewSettings } from './main';

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
  | { type: 'initSidebar'; document: BoardDocument; editorState: EditorState }
  | { type: 'updateEditorState'; editorState: EditorState }
  | { type: 'textEditorCommand'; ids: string[]; command: TextEditorCommand }
  | { type: 'cursorMove'; x: number; y: number }
  | { type: 'cursorHide' }
  | { type: 'cursorTrackingChanged'; enabled: boolean }
  | { type: 'projectorStateChanged'; active: boolean; open: boolean; paused: boolean }
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
  | { type: 'goToElement'; elementId: string }
  | { type: 'settingsChanged'; settings: WebviewSettings };
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
  | { type: 'copyElements' }
  | { type: 'pasteElements' }
  | { type: 'duplicateElements' }
  | { type: 'cursorMove'; x: number; y: number }
  | { type: 'cursorLeave' }
  | { type: 'scroll'; top: number; left: number }
  | { type: 'selectElements'; ids: string[] }
  | { type: 'toggleElementSelection'; ids: string[] }
  | { type: 'selectTool'; tool: EditorTool }
  | { type: 'insertSpacerRows'; startRow: number; rowCount: number }
  | AddElementMessage
  | { type: 'deletePreset'; id: string }
  | { type: 'loadPresetAsset'; id: string }
  | { type: 'revealPresetsFile' }
  | {
      type: 'updateElementsLayout';
      changes: {
        id: string;
        changes: Partial<ElementLayout>;
        aspectRatio?: number;
      }[];
    } // Update the Layout when Element was moved or resized, array can handle one or more elements
  | AddElementMessage
  | { type: 'deleteElements'; ids: string[] }
  | {
      type: 'updateElements';
      changes: {
        id: string;
        changes: Omit<Partial<EditorElement>, 'id'>;
      }[];
    } // Update element with it's settings, array can handle one or more elements
  | { type: 'textEditorCommand'; ids: string[]; command: TextEditorCommand }
  | { type: 'addImageFromFile' }
  | { type: 'addImageFromBytes'; name: string; bytes: number[] }
  | { type: 'toggleCursorTracking' }
  | { type: 'toggleProjectorPaused' }
  | { type: 'updateProjectorPointer'; style: ProjectorPointerStyle }
  // Sent by the editor after drawing a new element (e.g. a freehand stroke).
  | { type: 'addFreehandElement'; element: EditorElement }
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
    }
  | { type: 'saveHtmlExport'; html: string; backgroundColor: string };

type AddElementMessage = {
  [T in EditorElementType]: {
    type: 'addElement';
    elementType: T;
    elementPosition: ElementLayout;
    defaults?: AddElementDefaults;
  };
}[EditorElementType];
