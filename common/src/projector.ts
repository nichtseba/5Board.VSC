export type ProjectorPointerShape = 'dot' | 'ring' | 'rectangle' | 'duck';

export type ProjectorPointerStyle = {
  color: string;
  shape: ProjectorPointerShape;
};

// Predefined colours offered as swatches in the sidebar. The `id` maps to a
// localized name for the swatch tooltip.
export const PROJECTOR_POINTER_PRESET_COLORS = [
  { id: 'foreground', value: 'var(--vscode-editor-foreground)' },
  { id: 'muted', value: 'var(--vscode-descriptionForeground)' },
  { id: 'background', value: 'var(--vscode-editor-background)' },
  { id: 'primary', value: 'var(--vscode-progressBar-background)' },
  { id: 'secondary', value: 'var(--vscode-modernUI-shellBackground)' },
  { id: 'accent1', value: 'var(--vscode-editorBracketHighlight-foreground1)' },
  { id: 'accent2', value: 'var(--vscode-symbolIcon-classForeground)' },
  { id: 'red', value: 'var(--vscode-charts-red, #f14c4c)' },
  { id: 'orange', value: 'var(--vscode-charts-orange, #d18616)' },
  { id: 'yellow', value: 'var(--vscode-charts-yellow, #cca700)' },
  { id: 'green', value: 'var(--vscode-charts-green, #89d185)' },
  { id: 'blue', value: 'var(--vscode-charts-blue, #3794ff)' },
  { id: 'purple', value: 'var(--vscode-charts-purple, #b180d7)' },
  { id: 'black', value: 'var(--vscode-charts-black, #000000)' },
  { id: 'white', value: 'var(--vscode-charts-white, #ffffff)' },
] as const;

export const DEFAULT_PROJECTOR_POINTER_STYLE: ProjectorPointerStyle = {
  color: 'var(--vscode-charts-red, #f14c4c)',
  shape: 'dot',
};
