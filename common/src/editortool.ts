import { EditorElement, TranslationKey } from './main';

export enum EditorToolId {
  POINTER = 'pointer',
  SPACER = 'spacer',
  FREEHAND = 'freehand',
  AddElement = 'addElement',
}

export const DEFAULT_TOOL_ID: EditorToolId = EditorToolId.POINTER;

export type EditorToolDefinition = {
  labelKey: TranslationKey;
  icon: string;
};

export const TOOL_DEFINITIONS = {
  [EditorToolId.POINTER]: {
    labelKey: 'webview.sidebar.tools.pointer',
    icon: 'cursor',
  },
  [EditorToolId.SPACER]: {
    labelKey: 'webview.sidebar.tools.spacer',
    icon: 'move',
  },
  [EditorToolId.FREEHAND]: {
    labelKey: 'webview.sidebar.tools.freehand',
    icon: 'pencil',
  },
  [EditorToolId.AddElement]: {
    labelKey: 'webview.sidebar.tools.addElement',
    icon: 'add',
  },
} satisfies Record<EditorToolId, EditorToolDefinition>;

type TYPE_TOOL_PARAMETERS = {
  [EditorToolId.POINTER]: undefined;
  [EditorToolId.SPACER]: undefined;
  [EditorToolId.FREEHAND]: FreehandToolParameters;
  [EditorToolId.AddElement]: AddElementToolParameters;
};

type FreehandToolParameters = unknown;

type AddElementToolParameters = {
  type: EditorElement['type'];
  layout?: Omit<EditorElement['layout'], 'xPos' | 'yPos'>;
  style?: EditorElement['style'];
  data?: EditorElement['data'];
};

export type EditorTool<EditorToolType extends EditorToolId = EditorToolId> = {
  type: EditorToolType;
  parameters: TYPE_TOOL_PARAMETERS[EditorToolType];
};

export type EditorState = { tool: EditorTool };
