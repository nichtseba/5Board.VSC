import { EditorElement, EditorElementType } from '5board.vsc-common';

type Props = {
  element: EditorElement<EditorElementType.Code>;
};

export function CodeSettings({ element }: Props) {
  return <div>Add settings for {element.id}</div>;
}
