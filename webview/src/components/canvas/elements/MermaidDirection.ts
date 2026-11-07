export type MermaidDirection = 'TD' | 'BT' | 'LR' | 'RL';

const DIRECTION_REGEX = /^\s*(?:flowchart|graph)\s+(TD|BT|LR|RL)\b/im;

//Getter of diagram direction
export function getMermaidDirection(source: string): MermaidDirection | undefined {
  const match = source.match(DIRECTION_REGEX);
  return match?.[1] as MermaidDirection | undefined;
}

//Direction buttons only work for flowcharts and graphs
export function isSupportedMermaidDiagram(source: string): boolean {
  return /^\s*(?:flowchart|graph)\b/im.test(source);
}

export function updateMermaidDirection(source: string, direction: MermaidDirection): string {
  return source.replace(/^(\s*(?:flowchart|graph)\s+)(TD|BT|LR|RL)\b/im, `$1${direction}`);
}
