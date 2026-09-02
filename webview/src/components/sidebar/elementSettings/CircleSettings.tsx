import { EditorElement, EditorElementType } from '5board.vsc-common';

type Props = {
  element: EditorElement<EditorElementType.Circle>;
};

/**
 * Settings panel for Line elements
 * Allows configuration of stroke properties and arrow heads
 */
export function CircleSettings({ element }: Props) {
  return <div>Add settings for {element.id}</div>;
}
