import { EditorElementType } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';

export function ShapeElement({ element }: EditorElementProps<EditorElementType.Shape>) {
  return <div>{element.type}</div>;
}
