export type ProjectorPointerShape = 'dot' | 'ring' | 'rectangle' | 'duck';

export type ProjectorPointerStyle = {
  color: string;
  shape: ProjectorPointerShape;
};

// Predefined colours offered as swatches in the sidebar
export const PROJECTOR_POINTER_PRESET_COLORS = [
  'var(--vscode-charts-red, #f14c4c)',
  'var(--vscode-charts-orange, #d18616)',
  'var(--vscode-charts-yellow, #cca700)',
  'var(--vscode-charts-green, #89d185)',
  'var(--vscode-charts-blue, #3794ff)',
  'var(--vscode-charts-purple, #b180d7)',
];

export const DEFAULT_PROJECTOR_POINTER_STYLE: ProjectorPointerStyle = {
  color: 'var(--vscode-charts-red, #f14c4c)',
  shape: 'dot',
};
