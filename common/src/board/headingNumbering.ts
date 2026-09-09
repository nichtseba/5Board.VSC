import { BoardElement, EditorElementType } from './element.js';
import {
  HeadingLevel,
  HeadingNumberingStyle,
  HeadingSettings,
  getHeadingNumberingEnabled,
  getHeadingNumberingStyle,
} from './headingSettings.js';

export type ComputeHeadingNumberOptions = Pick<
  HeadingSettings,
  'numberingEnabled' | 'numberingFormats' | 'numberingFormat'
>;

/**
 * Computes hierarchical heading numbers (e.g. "1", "1.1", "1.2", "2") for all
 * visible heading elements, derived from their spatial position on the canvas.
 *
 * Ordering is reading order: top-to-bottom by `yPos`, then left-to-right by
 * `xPos` for headings on the same row. Numbers nest by heading level
 * (H1 = top level, H2 = sub-section, ...).
 *
 * The numbers are derived, never stored on the element. Moving, adding or changing the heading
 * updates the numbering "automagically".
 *
 *
 * @param elements All elements on the board (only headings are considered).
 * @returns A map from heading element id to its computed number string.
 */
export function computeHeadingNumbers(
  elements: BoardElement[],
  options?: ComputeHeadingNumberOptions,
): Map<string, string> {
  if (!getHeadingNumberingEnabled(options)) {
    return new Map();
  }

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
        .map((counter, index) =>
          counter === 0
            ? '0'
            : formatCounter(
                counter,
                getHeadingNumberingStyle(options, (index + 1) as HeadingLevel),
              ),
        )
        .join('.'),
    );
  }

  return numbers;
}

function formatCounter(counter: number, format: HeadingNumberingStyle): string {
  switch (format) {
    case 'decimal':
      return String(counter);
    case 'lower-alpha':
      return formatAlpha(counter);
    case 'upper-alpha':
      return formatAlpha(counter).toUpperCase();
    case 'lower-roman':
      return formatRoman(counter).toLowerCase();
    case 'upper-roman':
      return formatRoman(counter);
  }
}

function formatAlpha(counter: number): string {
  let value = counter;
  let result = '';

  while (value > 0) {
    value--;
    result = String.fromCharCode(97 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }

  return result;
}

function formatRoman(counter: number): string {
  const romanParts: [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];

  let value = counter;
  let result = '';

  for (const [amount, symbol] of romanParts) {
    while (value >= amount) {
      result += symbol;
      value -= amount;
    }
  }

  return result;
}
