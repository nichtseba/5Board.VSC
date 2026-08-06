import { BoardDocument, EditorElementType } from '5board.vsc-common';

export type FindFlags = { matchCase: boolean; wholeWord: boolean; regex: boolean };
export type FindMatch = { elementId: string; start: number; end: number };
export type ContentSegment = { text: string; kind: 'plain' | 'match' | 'current' };

const SEARCHABLE_TYPES = new Set<EditorElementType>([
  EditorElementType.Heading,
  EditorElementType.Text,
  EditorElementType.Code,
]);

function buildFindRegex(query: string, flags: FindFlags): RegExp {
  let source = flags.regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (flags.wholeWord) {
    source = `\\b(?:${source})\\b`;
  }
  return new RegExp(source, flags.matchCase ? 'g' : 'gi');
}

/**
 * Finds all matches of the query in the text content of searchable elements,
 * ordered by visual reading order (top to bottom, left to right).
 */
export function computeMatches(
  boardDocument: BoardDocument,
  query: string,
  flags: FindFlags,
): { matches: FindMatch[]; invalidQuery: boolean } {
  if (!query) {
    return { matches: [], invalidQuery: false };
  }

  let regex: RegExp;
  try {
    regex = buildFindRegex(query, flags);
  } catch {
    return { matches: [], invalidQuery: true };
  }

  const elements = boardDocument.content.elements
    .filter((element) => SEARCHABLE_TYPES.has(element.type))
    .sort((a, b) => a.layout.yPos - b.layout.yPos || a.layout.xPos - b.layout.xPos);

  const matches: FindMatch[] = [];
  for (const element of elements) {
    const content = (element.data as { content?: string }).content ?? '';
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      matches.push({
        elementId: element.id,
        start: match.index,
        end: match.index + match[0].length,
      });
      if (match[0].length === 0) {
        regex.lastIndex++;
      }
    }
    regex.lastIndex = 0;
  }
  return { matches, invalidQuery: false };
}

/**
 * Splits element content into plain and highlighted segments.
 * Matches must belong to this content and be sorted by start position.
 */
export function segmentContent(
  content: string,
  matches: FindMatch[],
  currentMatch: FindMatch | null,
): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let position = 0;
  for (const match of matches) {
    if (match.start > position) {
      segments.push({ text: content.slice(position, match.start), kind: 'plain' });
    }
    segments.push({
      text: content.slice(match.start, match.end),
      kind: match === currentMatch ? 'current' : 'match',
    });
    position = match.end;
  }
  if (position < content.length) {
    segments.push({ text: content.slice(position), kind: 'plain' });
  }
  return segments;
}
