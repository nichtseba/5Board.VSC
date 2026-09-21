export type CommentPrefix = '//' | '#';

const openTag = (blockId: string, prefix: CommentPrefix) => `${prefix} <block id="${blockId}">`;
const closeTag = (prefix: CommentPrefix) => `${prefix} </block>`;

/** Wraps code in a block's open and close markers, without any indentation. */
export function markBlock(blockId: string, code: string, prefix: CommentPrefix): string {
  return `${openTag(blockId, prefix)}\n${code}\n${closeTag(prefix)}`;
}

interface BlockLocation {
  openTagStart: number;
  contentStart: number;
  closeTagStart: number;
}

function findBlock(
  sourceCode: string,
  blockId: string,
  prefix: CommentPrefix,
): BlockLocation | null {
  const open = openTag(blockId, prefix);
  const openTagStart = sourceCode.indexOf(open);
  if (openTagStart === -1) return null;

  const contentStart = openTagStart + open.length;
  const closeTagStart = sourceCode.indexOf(closeTag(prefix), contentStart);
  if (closeTagStart === -1) return null;

  return { openTagStart, contentStart, closeTagStart };
}

function lineStart(sourceCode: string, index: number): number {
  return sourceCode.lastIndexOf('\n', index) + 1;
}

export function extractBlock(
  sourceCode: string,
  blockId: string,
  prefix: CommentPrefix,
): string | null {
  const block = findBlock(sourceCode, blockId, prefix);
  if (!block) return null;
  return dedentBlock(sourceCode.slice(block.contentStart, block.closeTagStart));
}

/**
 * Must stay the exact inverse of {@link indentCode}: any difference replaces the Monaco model
 * and moves the caret. So only the two structural lines are dropped and blank lines never change.
 */
function dedentBlock(raw: string): string {
  const lines = raw.split('\n');
  if (lines.length > 0 && lines[0].trim() === '') lines.shift();
  if (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();

  const minIndent = minIndentOf(lines);
  return lines.map((line) => (line.trim() === '' ? line : line.slice(minIndent))).join('\n');
}

function minIndentOf(lines: string[]): number {
  const indents = lines
    .filter((line) => line.trim() !== '')
    .map((line) => line.match(/^[ \t]*/)![0].length);
  return indents.length > 0 ? Math.min(...indents) : 0;
}

export function hasBlock(sourceCode: string, blockId: string, prefix: CommentPrefix): boolean {
  return sourceCode.includes(openTag(blockId, prefix));
}

export function insertBlockIntoClass(
  sourceCode: string,
  blockId: string,
  blockCode: string,
  prefix: CommentPrefix,
  indent: number,
): string {
  const block = `${indentCode(markBlock(blockId, blockCode, prefix), indent)}\n`;

  // Generated sources hold exactly one top-level class, so the last `}` is its closing brace.
  const braceIndex = sourceCode.lastIndexOf('}');
  if (braceIndex === -1) return sourceCode + block;
  return sourceCode.slice(0, braceIndex) + block + sourceCode.slice(braceIndex);
}

export function removeBlock(sourceCode: string, blockId: string, prefix: CommentPrefix): string {
  const block = findBlock(sourceCode, blockId, prefix);
  if (!block) return sourceCode;

  const start = lineStart(sourceCode, block.openTagStart);
  const newlineAfterClose = sourceCode.indexOf('\n', block.closeTagStart);
  const end = newlineAfterClose === -1 ? sourceCode.length : newlineAfterClose + 1;

  return sourceCode.slice(0, start) + sourceCode.slice(end);
}

export function updateBlock(
  sourceCode: string,
  blockId: string,
  newCode: string,
  prefix: CommentPrefix,
): string {
  const block = findBlock(sourceCode, blockId, prefix);
  if (!block) return sourceCode;

  // The replaced range swallows the close tag's leading whitespace, so restore its indentation.
  const markerIndent = sourceCode.slice(
    lineStart(sourceCode, block.openTagStart),
    block.openTagStart,
  );

  return (
    sourceCode.slice(0, block.contentStart) +
    `\n${newCode}\n${markerIndent}` +
    sourceCode.slice(block.closeTagStart)
  );
}

export function getBlockIndent(sourceCode: string, blockId: string, prefix: CommentPrefix): number {
  const block = findBlock(sourceCode, blockId, prefix);
  if (!block) return 0;

  const lines = sourceCode
    .slice(block.contentStart, block.closeTagStart)
    .split('\n')
    .filter((line) => line.trim() !== '');
  // An empty block has nothing to measure, so match the marker's own indentation.
  if (lines.length === 0) {
    return block.openTagStart - lineStart(sourceCode, block.openTagStart);
  }
  return minIndentOf(lines);
}

export function indentCode(code: string, spaces: number): string {
  if (spaces <= 0) return code;
  const pad = ' '.repeat(spaces);
  return code
    .split('\n')
    .map((line) => (line.trim() === '' ? line : pad + line))
    .join('\n');
}
