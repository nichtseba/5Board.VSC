export interface GridSettings {
  cellSize: number;
  columnCount: number;
}

export const DEFAULT_GRID_SETTINGS: GridSettings = {
  cellSize: 16,
  columnCount: 40,
};

export interface ColorPaletteSettings {
  customColors: string[];
}

export interface WebviewSettings {
  colorPalette: ColorPaletteSettings;
}

export const DEFAULT_WEBVIEW_SETTINGS: WebviewSettings = {
  colorPalette: {
    customColors: [],
  },
};
