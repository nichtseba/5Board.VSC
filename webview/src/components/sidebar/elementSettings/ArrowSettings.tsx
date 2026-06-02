import { EditorElement, EditorElementType } from '5board.vsc-common';

type Props = {
  element: EditorElement<EditorElementType.Arrow>;
};

export function ArrowSettings({ element }: Props) {
  return <div>Add settings for {element.id}</div>;
}
