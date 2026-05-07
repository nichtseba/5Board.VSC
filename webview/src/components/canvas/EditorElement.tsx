import { EditorElement, EditorElementType } from '5board.vsc-common/dist/Element';

export type EditorElementProps<T extends EditorElementType> = {
  element: EditorElement<T>;
  onSelect?: (id: string) => void;
  selected?: boolean;
};

/**
 * Renders an editor element based on its type. The actual rendering logic for each element type is delegated to specific components (e.g., HeadingElement for heading elements).
 * Uses {@link ELEMENT_COMPONENTS} to determine which component to render for each element type.
 */
export default function EditorElement<ElementType extends EditorElementType>({
  element,
  onSelect,
  selected,
}: EditorElementProps<ElementType>) {
  const ElementComponent = ELEMENT_COMPONENTS[element.type] as React.ComponentType<
    EditorElementProps<ElementType>
  >;
  return <ElementComponent element={element} onSelect={onSelect} selected={selected} />;
}

/**
 * Mapping of editor element types to their corresponding React components.
 */
const ELEMENT_COMPONENTS = {
  [EditorElementType.Heading]: HeadingElement,
} as const satisfies {
  [ElementType in EditorElementType]: React.ComponentType<EditorElementProps<ElementType>>;
};

/**
 * Renders a heading element. The heading level (h1, h2, etc.) is determined by the `level` property in the element's data.
 */
function HeadingElement({
  element,
  onSelect,
  selected,
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
        return <h1>{children}</h1>;
      case 2:
        return <h2>{children}</h2>;
      case 3:
        return <h3>{children}</h3>;
      case 4:
        return <h4>{children}</h4>;
      case 5:
        return <h5>{children}</h5>;
      case 6:
        return <h6>{children}</h6>;
      default:
        throw new Error(`Invalid heading level: ${level}`);
    }
  }
  return (
    <div
      onClick={() => onSelect?.(element.id)}
      className={`element element-heading ${selected ? 'element-selected' : ''}`}
      style={{
        gridRowStart: element.yPos + 1,
        gridRowEnd: `span ${element.height}`,
        gridColumnStart: 1,
        gridColumnEnd: 'span var(--editor-columns)',
      }}
    >
      <HeadingTag level={element.data.level}>{element.data.content}</HeadingTag>
    </div>
  );
}
