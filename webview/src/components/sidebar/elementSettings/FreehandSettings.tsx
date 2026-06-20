import { EditorElement, EditorElementType } from '5board.vsc-common';

type Props = {
  element: EditorElement<EditorElementType.Freehand>;
};

export function FreehandSettings({ element }: Props) {
  return <div>Add settings for {element.id}</div>;
}
