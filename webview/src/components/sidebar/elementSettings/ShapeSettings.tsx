import { EditorElement, EditorElementType } from '5board.vsc-common';

type Props = {
  elements: EditorElement<EditorElementType.Shape>[];
};

export function ShapeSettings({ elements }: Props) {
  const selectedElementIds = elements.map((element) => element.id);

  return <div>Add ShapeSettings for {selectedElementIds.join(', ')}</div>;
}
