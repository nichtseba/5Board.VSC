import { useMemo } from 'react';
import { EditorElementType } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';
import { useFind } from '../../../providers/FindProvider';
import { segmentContent } from '../../../services/findMatches';

/**
 * Renders a heading element. The heading level (h1, h2, etc.) is determined by the `level` property in the element's data.
 */
export function HeadingElement({ element }: EditorElementProps<EditorElementType.Heading>) {
  const find = useFind();
  const content = element.data.content;

  const segments = useMemo(() => {
    if (!find?.open) {
      return null;
    }
    const ownMatches = find.matches.filter((match) => match.elementId === element.id);
    if (ownMatches.length === 0) {
      return null;
    }
    const currentMatch = find.currentIndex >= 0 ? find.matches[find.currentIndex] : null;
    return segmentContent(content, ownMatches, currentMatch);
  }, [find, content, element.id]);

  /** Utility component for rendering the appropriate heading tag based on the level */
  function HeadingTag({
    children,
    level,
  }: {
    children: React.ReactNode;
    level: 1 | 2 | 3 | 4 | 5 | 6;
  }) {
    switch (level) {
      case 1:
        return <h1 className="text-4xl font-bold leading-tight">{children}</h1>;
      case 2:
        return <h2 className="text-3xl font-bold leading-tight">{children}</h2>;
      case 3:
        return <h3 className="text-2xl font-semibold leading-snug">{children}</h3>;
      case 4:
        return <h4 className="text-xl font-semibold leading-snug">{children}</h4>;
      case 5:
        return <h5 className="text-lg font-medium leading-normal">{children}</h5>;
      case 6:
        return <h6 className="text-base font-medium leading-normal">{children}</h6>;
      default:
        throw new Error(`Invalid heading level: ${level}`);
    }
  }

  return (
    <HeadingTag level={element.data.level}>
      {segments === null
        ? content
        : segments.map((segment, index) =>
            segment.kind === 'plain' ? (
              segment.text
            ) : (
              <mark
                key={index}
                className={`text-inherit ${
                  segment.kind === 'current'
                    ? 'bg-editor-find-match-background'
                    : 'bg-editor-find-match-highlight-background'
                }`}
              >
                {segment.text}
              </mark>
            ),
          )}
    </HeadingTag>
  );
}
