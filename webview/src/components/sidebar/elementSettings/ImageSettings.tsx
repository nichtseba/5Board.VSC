import { EditorElement, EditorElementType } from '5board.vsc-common';

type Props = {
  element: EditorElement<EditorElementType.Image>;
};

export function ImageSettings({ element }: Props) {
  return <div>Add settings for {element.id}</div>;
}
