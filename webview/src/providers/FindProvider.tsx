import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useBoardDocument } from './BoardDocumentProvider';
import { useMessageService } from '../services/MessageService';
import { computeMatches, FindFlags, FindMatch } from '../services/findMatches';

export type FindContextType = {
  open: boolean;
  query: string;
  flags: FindFlags;
  matches: FindMatch[];
  currentIndex: number;
  invalidQuery: boolean;
  openWidget(): void;
  closeWidget(): void;
  setQuery(query: string): void;
  toggleFlag(flag: keyof FindFlags): void;
  goToMatch(direction: 1 | -1): void;
  replaceCurrent(replacement: string): void;
  replaceAll(replacement: string): void;
};

// Context (null when no provider is mounted, e.g. in the projector view)
const FindContext = createContext<FindContextType | null>(null);

/**
 * Provides find & replace state for the editor: search query, flags,
 * computed matches and navigation/replace actions. Opened via Ctrl+F.
 */
export function FindProvider({ children }: { children: React.ReactNode }) {
  const boardDocument = useBoardDocument();
  const messages = useMessageService();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [flags, setFlags] = useState<FindFlags>({
    matchCase: false,
    wholeWord: false,
    regex: false,
  });
  const [currentIndex, setCurrentIndex] = useState(-1);

  const { matches, invalidQuery } = useMemo(
    () =>
      open && boardDocument
        ? computeMatches(boardDocument, query, flags)
        : { matches: [], invalidQuery: false },
    [open, boardDocument, query, flags],
  );

  // Keep the current index valid when the matches change (typing, document edits).
  useEffect(() => {
    setCurrentIndex((index) =>
      matches.length === 0 ? -1 : Math.min(Math.max(index, 0), matches.length - 1),
    );
  }, [matches]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, []);

  const navigateTo = (match: FindMatch) => {
    window.document
      .getElementById(match.elementId)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    messages.send({ type: 'selectElements', ids: [match.elementId] });
  };

  const goToMatch = (direction: 1 | -1) => {
    if (matches.length === 0) {
      return;
    }
    const next = (currentIndex + direction + matches.length) % matches.length;
    setCurrentIndex(next);
    navigateTo(matches[next]);
  };

  const getElementContent = (elementId: string): string => {
    const element = boardDocument?.content.elements.find((e) => e.id === elementId);
    return (element?.data as { content?: string } | undefined)?.content ?? '';
  };

  const replaceCurrent = (replacement: string) => {
    const match = matches[currentIndex] as FindMatch | undefined;
    if (!match) {
      return;
    }
    const content = getElementContent(match.elementId);
    messages.send({
      type: 'replaceElementContent',
      changes: [
        {
          id: match.elementId,
          content: content.slice(0, match.start) + replacement + content.slice(match.end),
        },
      ],
    });
  };

  const replaceAll = (replacement: string) => {
    if (matches.length === 0) {
      return;
    }
    const byElement = new Map<string, FindMatch[]>();
    for (const match of matches) {
      const list = byElement.get(match.elementId) ?? [];
      list.push(match);
      byElement.set(match.elementId, list);
    }
    const changes = [...byElement.entries()].map(([id, elementMatches]) => {
      let content = getElementContent(id);
      // Apply replacements back to front so earlier match indices stay valid.
      for (const match of [...elementMatches].reverse()) {
        content = content.slice(0, match.start) + replacement + content.slice(match.end);
      }
      return { id, content };
    });
    messages.send({ type: 'replaceElementContent', changes });
  };

  const value: FindContextType = {
    open,
    query,
    flags,
    matches,
    currentIndex,
    invalidQuery,
    openWidget: () => setOpen(true),
    closeWidget: () => setOpen(false),
    setQuery,
    toggleFlag: (flag) => setFlags((prev) => ({ ...prev, [flag]: !prev[flag] })),
    goToMatch,
    replaceCurrent,
    replaceAll,
  };

  return <FindContext.Provider value={value}>{children}</FindContext.Provider>;
}

// Hook
export function useFind() {
  return useContext(FindContext);
}
