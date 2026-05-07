import { EditorElement, EditorElementType } from '5board.vsc-common/dist/Element';

export type EditorElementProps<T extends EditorElementType> = {
  element: EditorElement<T>;
  onSelect?: (id: string) => void;
  selected?: boolean;
};

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

const ELEMENT_COMPONENTS = {
  [EditorElementType.Heading]: HeadingElement,
} as const satisfies {
  [ElementType in EditorElementType]: React.ComponentType<EditorElementProps<ElementType>>;
};

function HeadingElement({
  element,
  onSelect,
  selected,
}: EditorElementProps<EditorElementType.Heading>) {
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
      className={`element element-heading ${selected ? 'element-active' : ''}`}
      style={{ top: `calc(var(--editor-spacing) * ${element.yPos})` }}
    >
      <HeadingTag level={element.data.level}>{element.data.content}</HeadingTag>
    </div>
  );
}
