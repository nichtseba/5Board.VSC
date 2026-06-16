import { BoardElement, EditorElementType } from './element';

/**
 * Computes hierarchical heading numbers (e.g. "1", "1.1", "1.2", "2") for all
 * visible heading elements, derived from their spatial position on the canvas.
 *
 * Ordering is reading order: top-to-bottom by `yPos`, then left-to-right by
 * `xPos` for headings on the same row. Numbers nest by heading level
 * (H1 = top level, H2 = sub-section, ...).
 *
 * The numbers are derived, never stored on the element. Moving, adding or changing the heading
 * updates the nubmering "automagically".
 *
 *
 * @param elements All elements on the board (only headings are considered).
 * @returns A map from heading element id to its computed number string.
 */
export function computeHeadingNumbers(elements: BoardElement[]): Map<string, string> {
  const headings = elements
    .filter((el) => el.type === EditorElementType.Heading && el.style.visible !== false)
    .slice()
    .sort((a, b) => a.layout.yPos - b.layout.yPos || a.layout.xPos - b.layout.xPos);

  const numbers = new Map<string, string>();
  const counters = [0, 0, 0, 0, 0, 0];

  for (const heading of headings) {
    const level = (heading.data as { level: number }).level;

    counters[level - 1]++;
    for (let deeper = level; deeper < counters.length; deeper++) {
      counters[deeper] = 0;
    }

    numbers.set(
      heading.id,
      counters
        .slice(0, level)
        .filter((c) => c !== 0)
        .join('.'),
    );
  }

  return numbers;
}
