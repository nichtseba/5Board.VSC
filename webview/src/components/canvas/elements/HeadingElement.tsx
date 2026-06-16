import { EditorElementType } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';
import { useHeadingNumber } from '../HeadingNumberingContext';

/**
 * Renders a heading element. The heading level (h1, h2, etc.) is determined by the `level` property in the element's data.
 * A hierarchical index (e.g. "1.", "1.1") derived from the heading's position is prefixed to the content.
 */
export function HeadingElement({ element }: EditorElementProps<EditorElementType.Heading>) {
  const number = useHeadingNumber(element.id);

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
      {number ? <span className="heading-index">{number} </span> : null}
      {element.data.content}
    </HeadingTag>
  );
}
