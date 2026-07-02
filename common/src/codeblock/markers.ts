/**
 * Read/write ID-tagged code blocks inside source files:
 *   {commentPrefix} <block id="<blockId>">
 *   <code>
 *   {commentPrefix} </block>
 */

export type CommentPrefix = '//' | '#';

const openTag = (blockId: string, prefix: CommentPrefix = '//') =>
  `${prefix} <block id="${blockId}">`;
const closeTag = (prefix: CommentPrefix = '//') => `${prefix} </block>`;

/** Returns the code between the block's markers, or null if the block is not present. */
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
 * Drops the blank edge lines left by the markers and the common leading indentation, so the
 * block is not shown indented by its class/method nesting. Relative indentation is preserved.
 */
function dedentBlock(raw: string): string {
  const lines = raw.split('\n');
  while (lines.length > 0 && lines[0].trim() === '') lines.shift();
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();

  const indents = lines
    .filter((line) => line.trim() !== '')
    .map((line) => line.match(/^[ \t]*/)![0].length);
  const minIndent = indents.length > 0 ? Math.min(...indents) : 0;

  return lines.map((line) => line.slice(minIndent)).join('\n');
}

export function hasBlock(
  sourceCode: string,
  blockId: string,
  prefix: CommentPrefix = '//',
): boolean {
  return sourceCode.includes(openTag(blockId, prefix));
}

/**
 * Inserts a block as a class member, before the class's closing brace — the last `}` in the
 * file, since generated sources contain a single top-level class.
 */
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

  const braceIndex = sourceCode.lastIndexOf('}');
  if (braceIndex === -1) return sourceCode + block;
  return sourceCode.slice(0, braceIndex) + block + sourceCode.slice(braceIndex);
}

/**
 * Removes a block whole-line. Removing the last block leaves an empty (zombie) class —
 * intentional, sources are never deleted by block ops.
 */
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

  // Re-indent the close tag like the open tag; its old indentation is part of the replaced range.
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

/**
 * Minimum indentation inside the block, falling back to the marker's own indentation for
 * empty blocks; used to re-indent edited code before writing back.
 */
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
