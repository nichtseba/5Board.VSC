import { EditorElement, EditorElementType } from '5board.vsc-common';

type Props = {
  element: EditorElement<EditorElementType.Shape>;
};

export function ShapeSettings({ element }: Props) {
  return <div>Add settings for {element.id}</div>;
}
