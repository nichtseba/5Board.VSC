import {
  AddElementDefaults,
  AddElementPlacementMode,
  EditorElementType,
  TranslationKey,
  LineStyle,
} from './main.js';

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

// Color, width, opacity and line style the freehand tool draws with. Chosen in the sidebar.
export type FreehandToolParameters = {
  color: string;
  width: number;
  opacity: number; // 0..1, applied as the element's opacity
  lineStyle: LineStyle;
  dashScale: number; // dash/gap size (multiple of width) for the 'custom' line style
};

// Selectable freehand line styles. The `id` maps to a localized name.
export const FREEHAND_LINE_STYLES = [
  { id: 'solid' },
  { id: 'dashed' },
  { id: 'dotted' },
  { id: 'custom' },
] as const satisfies { id: LineStyle }[];

// Dash/gap range (multiple of width) for the 'custom' line style slider.
export const FREEHAND_MIN_DASH = 1;
export const FREEHAND_MAX_DASH = 10;
export const FREEHAND_DEFAULT_DASH = 3;

// Selectable freehand colors. The `id` maps to a localized name for the tooltip.
export const FREEHAND_COLORS = [
  { id: 'red', value: 'var(--vscode-charts-red, #f14c4c)' },
  { id: 'orange', value: 'var(--vscode-charts-orange, #d18616)' },
  { id: 'yellow', value: 'var(--vscode-charts-yellow, #cca700)' },
  { id: 'green', value: 'var(--vscode-charts-green, #89d185)' },
  { id: 'blue', value: 'var(--vscode-charts-blue, #3794ff)' },
  { id: 'purple', value: 'var(--vscode-charts-purple, #b180d7)' },
  { id: 'black', value: 'var(--vscode-charts-black, #000000)' },
  { id: 'white', value: 'var(--vscode-charts-white, #ffffff)' },
] as const;

// Freehand stroke width range (in pixels), chosen with a slider in the sidebar.
export const FREEHAND_MIN_WIDTH = 1;
export const FREEHAND_MAX_WIDTH = 20;
export const FREEHAND_DEFAULT_WIDTH = 4;

export const DEFAULT_FREEHAND_PARAMETERS: FreehandToolParameters = {
  color: FREEHAND_COLORS[0].value,
  width: FREEHAND_DEFAULT_WIDTH,
  opacity: 1,
  lineStyle: 'solid',
  dashScale: FREEHAND_DEFAULT_DASH,
};

export type AddElementToolParameters<T extends EditorElementType = EditorElementType> = {
  type: T;
  placementMode?: AddElementPlacementMode;
  defaults?: AddElementDefaults<T>;
};

export function createAddElementTool<T extends EditorElementType>(
  type: T,
  overrides: Partial<AddElementToolParameters<T>> = {},
): EditorTool<EditorToolId.AddElement> {
  return {
    type: EditorToolId.AddElement,
    parameters: {
      type,
      placementMode: 'free',
      ...overrides,
    },
  };
}

export type EditorTool<EditorToolType extends EditorToolId = EditorToolId> = {
  type: EditorToolType;
  parameters: TYPE_TOOL_PARAMETERS[EditorToolType];
};

export type EditorState = { tool: EditorTool };
