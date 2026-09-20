import { EditorElement } from '5board.vsc-common';

type Props = {
  elements: EditorElement[];
};

export function CommonSettings({ elements }: Props) {
  const selectedElementIds = elements.map((element) => element.id);
  return <div>Add CommonSettings for {selectedElementIds.join(', ')}</div>;
}
