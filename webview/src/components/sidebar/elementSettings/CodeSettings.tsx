import { EditorElement, EditorElementType } from '5board.vsc-common';

type Props = {
  elements: EditorElement<EditorElementType.Code>[];
};

export function CodeSettings({ elements }: Props) {
  const selectedElementIds = elements.map((element) => element.id);
  return <div>Add CodeSettings for {selectedElementIds.join(', ')}</div>;
}
