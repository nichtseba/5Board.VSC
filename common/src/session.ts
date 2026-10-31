/**
 * Types shared between the extension and the live server (teacher <-> server <-> students).
 * Keep in sync with `server/src/protocol.ts` until the server imports them from here.
 */

export const DEFAULT_SERVER_URL = 'http://localhost:3000';

export const REACTION_KINDS = ['tooFast', 'tooSlow', 'unclear', 'good', 'panic'] as const;
export type ReactionKind = (typeof REACTION_KINDS)[number];

export const MARK_EMOJIS = ['❓', '😕', '👍', '🔴'] as const;
export type MarkEmoji = (typeof MARK_EMOJIS)[number];

/** Messages the server sends to the teacher (the extension). */
export type ServerToTeacher =
  | { type: 'ready'; code: string }
  | { type: 'participants'; count: number }
  | {
      type: 'reactionCounts';
      counts: Record<ReactionKind, number>;
      windowSeconds: number;
    }
  /** x and y are between 0 and 1, relative to the board (like the projector cursor). */
  | { type: 'mark'; x: number; y: number; emoji: MarkEmoji };

export function isReactionKind(value: unknown): value is ReactionKind {
  return typeof value === 'string' && (REACTION_KINDS as readonly string[]).includes(value);
}

export function isMarkEmoji(value: unknown): value is MarkEmoji {
  return typeof value === 'string' && (MARK_EMOJIS as readonly string[]).includes(value);
}

function parseReactionCounts(value: unknown): Record<ReactionKind, number> | null {
  if (typeof value !== 'object' || value === null) return null;
  const source = value as Record<string, unknown>;
  const counts = {} as Record<ReactionKind, number>;
  for (const kind of REACTION_KINDS) {
    const count = source[kind];
    if (typeof count !== 'number' || !Number.isFinite(count)) return null;
    counts[kind] = count;
  }
  return counts;
}

/** Checks a message from the server. Returns null for anything unexpected. */
export function parseServerToTeacher(raw: string): ServerToTeacher | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const message = data as Record<string, unknown>;

  switch (message.type) {
    case 'ready':
      return typeof message.code === 'string' ? { type: 'ready', code: message.code } : null;
    case 'participants':
      return typeof message.count === 'number' && Number.isFinite(message.count)
        ? { type: 'participants', count: message.count }
        : null;
    case 'reactionCounts': {
      const counts = parseReactionCounts(message.counts);
      return counts && typeof message.windowSeconds === 'number'
        ? { type: 'reactionCounts', counts, windowSeconds: message.windowSeconds }
        : null;
    }
    case 'mark':
      return typeof message.x === 'number' &&
        typeof message.y === 'number' &&
        Number.isFinite(message.x) &&
        Number.isFinite(message.y) &&
        isMarkEmoji(message.emoji)
        ? { type: 'mark', x: message.x, y: message.y, emoji: message.emoji }
        : null;
    default:
      return null;
  }
}
