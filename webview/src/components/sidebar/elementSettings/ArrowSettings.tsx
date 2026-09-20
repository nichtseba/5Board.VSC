import { EditorElement, EditorElementType } from '5board.vsc-common';

type Props = {
  elements: EditorElement<EditorElementType.Arrow>[];
};

export function ArrowSettings({ elements }: Props) {
  const selectedElementIds = elements.map((element) => element.id);
  return <div>Add ArrowSettings for {selectedElementIds.join(', ')}</div>;
}
