import { EditorElementType } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';

/**
 * Renders a heading element. The heading level (h1, h2, etc.) is determined by the `level` property in the element's data.
 */
export function HeadingElement({
  element,
  onSelect,
  selected,
  targetRef,
}: EditorElementProps<EditorElementType.Heading>) {
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
    <div
      onClick={() => onSelect?.(element.id)}
      ref={targetRef}
      className={`editor-element editor-element-hover ${selected ? 'editor-element-selected' : ''} pl-[var(--editor-spacing)] font-bold`}
      style={{
        gridRowStart: element.layout.yPos + 1,
        gridRowEnd: `span ${element.layout.height}`,
        gridColumnStart: element.layout.xPos + 1,
        gridColumnEnd: `span ${element.layout.width}`,
      }}
    >
      <HeadingTag level={element.data.level}>{element.data.content}</HeadingTag>
    </div>
  );
}
