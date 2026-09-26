import { EditorElement } from '5board.vsc-common';

// Highest/lowest zIndex among all elements (missing values count as 0), used to
// compute the next value for "bring to front" / "send to back".
export function maxZIndex(elements: EditorElement[]): number {
  return elements.reduce((max, el) => Math.max(max, el.layout.zIndex ?? 0), 0);
}

export function minZIndex(elements: EditorElement[]): number {
  return elements.reduce((min, el) => Math.min(min, el.layout.zIndex ?? 0), 0);
}
