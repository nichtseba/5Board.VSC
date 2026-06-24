/**
 * Utilities for reading and writing ID-tagged code blocks inside source files.
 *
 * Marker format:
 *   {commentPrefix} <block id="<blockId>">
 *   <code>
 *   {commentPrefix} </block>
 *
 * The comment prefix is language-specific (e.g. "//" for Java/JS, "#" for Python).
 */

export type CommentPrefix = '//' | '#';

export const COMMENT_PREFIX_BY_LANGUAGE: Record<string, CommentPrefix> = {
  java: '//',
  javascript: '//',
  python: '#',
};

const openTag = (blockId: string, prefix: CommentPrefix = '//') =>
  `${prefix} <block id="${blockId}">`;
const closeTag = (prefix: CommentPrefix = '//') => `${prefix} </block>`;

/**
 * Returns the code between the markers for the given blockId,
 * or null if the block is not present in the source.
 */
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
 * Normalizes raw block content for display/editing. Drops the blank edge lines left by the
 * marker lines (the newline after the open tag and the close tag's own indentation), then
 * removes the common leading indentation so the block is not shown indented by its
 * surrounding class/method nesting. Relative indentation inside the block is preserved.
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
 * Appends a new block with the given blockId and code to the end of the source.
 */
export function insertBlock(
  sourceCode: string,
  blockId: string,
  blockCode: string,
  prefix: CommentPrefix = '//',
): string {
  const block = `\n${openTag(blockId, prefix)}\n${blockCode}\n${closeTag(prefix)}\n`;
  return sourceCode + block;
}

/**
 * Replaces the content of an existing block in-place.
 */
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

  return sourceCode.slice(0, contentStart) + '\n' + newCode + '\n' + sourceCode.slice(endIndex);
}

/**
 * Returns the minimum indentation (number of leading spaces) of the content
 * inside the given block. Used to re-indent edited code before writing it back.
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
  if (lines.length === 0) return 0;

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
