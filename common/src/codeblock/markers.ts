export type CommentPrefix = '//' | '#';

const openTag = (blockId: string, prefix: CommentPrefix = '//') =>
  `${prefix} <block id="${blockId}">`;
const closeTag = (prefix: CommentPrefix = '//') => `${prefix} </block>`;

export function extractBlock(
  sourceCode: string,
  blockId: string,
  prefix: CommentPrefix = '//',
): string | null {
  const open = openTag(blockId, prefix);
  const close = closeTag(prefix);

  const startIndex = sourceCode.indexOf(open);
  if (startIndex === -1) return null;

  const contentStart = startIndex + open.length;
  const endIndex = sourceCode.indexOf(close, contentStart);
  if (endIndex === -1) return null;

  return dedentBlock(sourceCode.slice(contentStart, endIndex));
}

/**
 * Inverse of {@link indentCode}, and it has to stay an exact inverse: the editor writes the
 * block out and reads it straight back, and any difference replaces the Monaco model under the
 * user, which moves the caret.
 *
 * The stored form always begins with the newline that follows the open tag and ends with the
 * close tag's own indentation, so exactly one line is dropped at each end. Dropping *every*
 * blank line there would eat the user's own leading and trailing blank lines.
 */
function dedentBlock(raw: string): string {
  const lines = raw.split('\n');
  if (lines.length > 0 && lines[0].trim() === '') lines.shift();
  if (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();

  const indents = lines
    .filter((line) => line.trim() !== '')
    .map((line) => line.match(/^[ \t]*/)![0].length);
  const minIndent = indents.length > 0 ? Math.min(...indents) : 0;

  // Blank lines are left alone, because `indentCode` does not pad them either. Slicing them
  // would turn a line the user indented into an empty one.
  return lines.map((line) => (line.trim() === '' ? line : line.slice(minIndent))).join('\n');
}

export function hasBlock(
  sourceCode: string,
  blockId: string,
  prefix: CommentPrefix = '//',
): boolean {
  return sourceCode.includes(openTag(blockId, prefix));
}

export function insertBlockIntoClass(
  sourceCode: string,
  blockId: string,
  blockCode: string,
  prefix: CommentPrefix = '//',
): string {
  const indent = 4;
  const pad = ' '.repeat(indent);
  const block =
    `${pad}${openTag(blockId, prefix)}\n` +
    `${indentCode(blockCode, indent)}\n` +
    `${pad}${closeTag(prefix)}\n`;

  // Generated sources hold exactly one top-level class, so the last `}` is its closing brace.
  const braceIndex = sourceCode.lastIndexOf('}');
  if (braceIndex === -1) return sourceCode + block;
  return sourceCode.slice(0, braceIndex) + block + sourceCode.slice(braceIndex);
}

export function removeBlock(
  sourceCode: string,
  blockId: string,
  prefix: CommentPrefix = '//',
): string {
  const open = openTag(blockId, prefix);
  const close = closeTag(prefix);

  const openIndex = sourceCode.indexOf(open);
  if (openIndex === -1) return sourceCode;
  const closeIndex = sourceCode.indexOf(close, openIndex + open.length);
  if (closeIndex === -1) return sourceCode;

  const start = sourceCode.lastIndexOf('\n', openIndex) + 1;
  const newlineAfterClose = sourceCode.indexOf('\n', closeIndex);
  const end = newlineAfterClose === -1 ? sourceCode.length : newlineAfterClose + 1;

  return sourceCode.slice(0, start) + sourceCode.slice(end);
}

export function updateBlock(
  sourceCode: string,
  blockId: string,
  newCode: string,
  prefix: CommentPrefix = '//',
): string {
  const open = openTag(blockId, prefix);
  const close = closeTag(prefix);

  const startIndex = sourceCode.indexOf(open);
  if (startIndex === -1) return sourceCode;

  const contentStart = startIndex + open.length;
  const endIndex = sourceCode.indexOf(close, contentStart);
  if (endIndex === -1) return sourceCode;

  // The replaced range swallows the close tag's leading whitespace, so restore its indentation.
  const markerLineStart = sourceCode.lastIndexOf('\n', startIndex) + 1;
  const markerIndent = sourceCode.slice(markerLineStart, startIndex);

  return (
    sourceCode.slice(0, contentStart) +
    '\n' +
    newCode +
    '\n' +
    markerIndent +
    sourceCode.slice(endIndex)
  );
}

export function getBlockIndent(
  sourceCode: string,
  blockId: string,
  prefix: CommentPrefix = '//',
): number {
  const open = openTag(blockId, prefix);
  const close = closeTag(prefix);

  const startIndex = sourceCode.indexOf(open);
  if (startIndex === -1) return 0;

  const contentStart = startIndex + open.length;
  const endIndex = sourceCode.indexOf(close, contentStart);
  if (endIndex === -1) return 0;

  const raw = sourceCode.slice(contentStart, endIndex);
  const lines = raw.split('\n').filter((line) => line.trim() !== '');
  // An empty block has no content to measure, so match the marker's own indentation.
  if (lines.length === 0) {
    const markerLineStart = sourceCode.lastIndexOf('\n', startIndex) + 1;
    return startIndex - markerLineStart;
  }

  const indents = lines.map((line) => line.match(/^[ \t]*/)![0].length);
  return Math.min(...indents);
}

export function indentCode(code: string, spaces: number): string {
  if (spaces <= 0) return code;
  const pad = ' '.repeat(spaces);
  return code
    .split('\n')
    .map((line) => (line.trim() === '' ? line : pad + line))
    .join('\n');
}
