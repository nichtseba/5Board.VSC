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

// Color, width and opacity the freehand tool draws with. Chosen in the sidebar.
export type FreehandToolParameters = {
  color: string;
  width: number;
  opacity: number; // 0..1, applied as the element's opacity
};

// Selectable freehand colors. The `id` maps to a localized name for the tooltip.
export const FREEHAND_COLORS = [
  { id: 'red', value: '#e06c75' },
  { id: 'orange', value: '#d19a66' },
  { id: 'yellow', value: '#e5c07b' },
  { id: 'green', value: '#98c379' },
  { id: 'blue', value: '#61afef' },
  { id: 'purple', value: '#c678dd' },
  { id: 'black', value: '#000000' },
  { id: 'white', value: '#ffffff' },
] as const;

// Freehand stroke width range (in pixels), chosen with a slider in the sidebar.
export const FREEHAND_MIN_WIDTH = 1;
export const FREEHAND_MAX_WIDTH = 20;
export const FREEHAND_DEFAULT_WIDTH = 4;

export const DEFAULT_FREEHAND_PARAMETERS: FreehandToolParameters = {
  color: FREEHAND_COLORS[0].value,
  width: FREEHAND_DEFAULT_WIDTH,
  opacity: 1,
};

type AddElementToolParameters = {
  type: EditorElement['type'];
  layout: Omit<EditorElement['layout'], 'xPos' | 'yPos'>;
  style: EditorElement['style'];
  data: EditorElement['data'];
};

export type EditorTool<EditorToolType extends EditorToolId = EditorToolId> = {
  type: EditorToolType;
  parameters: TYPE_TOOL_PARAMETERS[EditorToolType];
};

export type EditorState = { tool: EditorTool };
