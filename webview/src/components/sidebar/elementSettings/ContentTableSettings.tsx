import { EditorElement, EditorElementType } from '5board.vsc-common';

type Props = {
  element: EditorElement<EditorElementType.ContentTable>;
};

export function ContentTableSettings({ element }: Props) {
  return <div>Add settings for {element.id}</div>;
}
