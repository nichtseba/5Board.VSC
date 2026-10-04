/**
 * Output color-code format for code block execution results.
 *
 * To colorize output, wrap text with <C{index}> ... </C> in your program:
 *   System.out.println("<C0>Hello in red</C> normal text");
 *
 * Color indices (0–7) map to a standard terminal-like palette:
 *   0 = red, 1 = green, 2 = yellow, 3 = blue,
 *   4 = magenta, 5 = cyan, 6 = white, 7 = gray
 */

export type OutputSegment =
  | { kind: 'text'; value: string }
  | { kind: 'colored'; colorIndex: number; value: string };

export function parseOutputColors(raw: string): OutputSegment[] {
  const segments: OutputSegment[] = [];
  const tagRe = /<C(\d)>([\s\S]*?)<\/C>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRe.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', value: raw.slice(lastIndex, match.index) });
    }
    segments.push({ kind: 'colored', colorIndex: Number(match[1]), value: match[2] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < raw.length) {
    segments.push({ kind: 'text', value: raw.slice(lastIndex) });
  }

  return segments;
}
