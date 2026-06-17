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

  return sourceCode.slice(contentStart, endIndex).replace(/^\n/, '').replace(/\n$/, '');
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
