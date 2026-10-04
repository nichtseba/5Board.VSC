import {
  AddElementDefaults,
  AddElementPlacementMode,
  EditorElementType,
  DEFAULT_ELEMENT_PROFILES,
  TranslationKey,
  LineStyle,
  ELEMENT_TYPE_DEFINITIONS,
  ImageElementData,
  FreehandElementData,
} from './main';
import type { Preset } from './board/presets';

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
  fixedXPosition?: number;
  presetId?: string;
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
const SHAPE_EXCEPTIONS = new Set([
  EditorElementType.Circle,
  EditorElementType.Rectangle,
  EditorElementType.Line,
]);

function getPresetPlacementMode(preset: Preset): AddElementPlacementMode {
  const { keepContent, keepXPosition } = preset.settings;
  const type = preset.element.type;
  if ((keepContent || keepXPosition) && SHAPE_EXCEPTIONS.has(type)) {
    // When not just style is part of the preset the element will be placed with the free mode
    return 'free';
  }
  const placement = ELEMENT_TYPE_DEFINITIONS[type]?.placement;
  return placement;
}

export function createAddElementToolFromPreset(
  preset: Preset,
): EditorTool<EditorToolId.AddElement> {
  const { element, settings } = preset;
  const type = element.type;
  const defaults = DEFAULT_ELEMENT_PROFILES[type];

  return createAddElementTool(type, {
    placementMode: getPresetPlacementMode(preset),
    fixedXPosition: settings.keepXPosition ? element.layout.xPos : undefined,
    presetId: preset.id,
    defaults: {
      layout: {
        width: element.layout.width,
        height: element.layout.height,
      },
      style: settings.keepStyle ? structuredClone(element.style) : structuredClone(defaults.style),
      data: settings.keepContent ? structuredClone(element.data) : structuredClone(defaults.data),
      ...(type === EditorElementType.Image && preset.asset?.bytes
        ? {
            asset: {
              name: (element.data as ImageElementData).src,
              bytes: [...preset.asset.bytes],
            },
          }
        : {}),
    } as AddElementDefaults<typeof type>,
  });
}

export function createFreehandToolFromPreset(
  preset: Preset,
): EditorTool<EditorToolId.FREEHAND> | undefined {
  if (
    preset.element.type !== EditorElementType.Freehand ||
    !preset.settings.keepStyle ||
    preset.settings.keepContent ||
    preset.settings.keepXPosition
  ) {
    return undefined;
  }

  const stroke = (preset.element.data as FreehandElementData).strokes[0];

  return {
    type: EditorToolId.FREEHAND,
    parameters: {
      color: stroke?.color ?? FREEHAND_COLORS[0].value,
      width: stroke?.width ?? FREEHAND_DEFAULT_WIDTH,
      opacity: preset.element.style.opacity ?? 1,
      lineStyle: stroke?.lineStyle ?? 'solid',
      dashScale: stroke?.dashScale ?? FREEHAND_DEFAULT_DASH,
    },
  };
}

export type EditorTool<EditorToolType extends EditorToolId = EditorToolId> = {
  type: EditorToolType;
  parameters: TYPE_TOOL_PARAMETERS[EditorToolType];
};

export type EditorState = { tool: EditorTool; presets: Preset[] };
