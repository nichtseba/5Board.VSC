import { BoardDocument } from './board/document.js';
import {
  HeadingLevel,
  HeadingLevelSettings,
  HeadingNumberingStyle,
} from './board/headingSettings.js';
import { Language } from './localization/index.js';
import { EditorElement, EditorState, EditorTool, ElementLayout } from './main.js';
import { ProjectorPointerStyle } from './projector.js';
import { TranscriptSegment } from './board/element.js';

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
  | {
      type: 'viewportUpdate';
      viewport: { top: number; left: number; height: number; width: number };
    }
  | { type: 'updateEditorState'; editorState: EditorState }
  | { type: 'codeblockStarted'; elementId: string }
  | { type: 'codeblockChunk'; elementId: string; segment: TranscriptSegment }
  | {
      type: 'codeblockExited';
      elementId: string;
      exitCode: number | null;
      success: boolean;
      truncated: boolean;
    }
  // Answers `ready` so a webview that opened (or reloaded) mid-run catches up on what it missed.
  | {
      type: 'codeblockSync';
      elementId: string;
      transcript: TranscriptSegment[];
      running: boolean;
    }
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
  | { type: 'selectTool'; tool: EditorTool }
  | { type: 'insertSpacerRows'; startRow: number; rowCount: number }
  | { type: 'updateElementLayout'; id: string; changes: Partial<ElementLayout> } // Update the Layout when Element was moved or resized
  | { type: 'updateElement'; id: string; changes: Partial<EditorElement> } // Update element with it's settings
  | { type: 'toggleCursorTracking' }
  | { type: 'updateProjectorPointer'; style: ProjectorPointerStyle }
  | {
      type: 'updateViewport';
      viewport: { top: number; left: number; height: number; width: number };
    }
  | { type: 'executeCodeblock'; elementId: string }
  | { type: 'codeblockInput'; elementId: string; text: string }
  | { type: 'codeblockEndInput'; elementId: string }
  | { type: 'codeblockStop'; elementId: string }
  | { type: 'updateBlockCode'; elementId: string; code: string }
  | { type: 'openSource'; elementId: string }
  | { type: 'copyToClipboard'; text: string }
  | { type: 'moveBlock'; elementId: string; className?: string | null; language?: string }
  | {
      type: 'manageCodeClass';
      op: 'create' | 'rename' | 'changeLanguage' | 'delete';
      name: string;
      language: string;
      newName?: string;
      newLanguage?: string;
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
