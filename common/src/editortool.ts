import {
  AddElementDefaults,
  AddElementPlacementMode,
  EditorElementType,
  TranslationKey,
} from './main';

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
