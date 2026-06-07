import { EditorElementType } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';

export function ShapeElement({ element }: EditorElementProps<EditorElementType.Shape>) {
  return <div>Add canvas element for {element.id}</div>;
}
