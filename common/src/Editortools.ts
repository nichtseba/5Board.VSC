import { EditorElement, TranslationKey } from './main';

export enum EditorToolId {
  POINTER = 'pointer',
  SPACER = 'spacer',
  FREEHAND = 'freehand',
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
} satisfies Record<EditorToolId, EditorToolDefinition>;

type TYPE_TOOL_PARAMETERS = {
  [EditorToolId.POINTER]: undefined;
  [EditorToolId.SPACER]: undefined;
  [EditorToolId.FREEHAND]: FreehandToolParameters;
};

// Color and width the freehand tool draws with. Chosen in the sidebar.
export type FreehandToolParameters = {
  color: string;
  width: number;
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

// Selectable freehand stroke widths (in pixels). The `id` maps to a localized name.
export const FREEHAND_WIDTHS = [
  { id: 'thin', value: 2 },
  { id: 'medium', value: 4 },
  { id: 'thick', value: 8 },
] as const;

export const DEFAULT_FREEHAND_PARAMETERS: FreehandToolParameters = {
  color: FREEHAND_COLORS[0].value,
  width: FREEHAND_WIDTHS[1].value,
};

export type EditorTool<EditorToolType extends EditorToolId = EditorToolId> = {
  type: EditorToolType;
  parameters: TYPE_TOOL_PARAMETERS[EditorToolType];
};

export type AddData = {
  type: EditorElement['type'];
  layout: Omit<EditorElement['layout'], 'xPos' | 'yPos'>;
  style: EditorElement['style'];
  data: EditorElement['data'];
};

export type EditorState = { tool: EditorTool };

export type ToolItem = {
  id: string;
  label: string;
  icon: string;
};

export type PresetItem = {
  id: string;
  label: string;
  description: string;
};
