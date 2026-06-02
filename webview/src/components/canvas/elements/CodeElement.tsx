import { EditorElementType } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';

export function CodeElement({ element }: EditorElementProps<EditorElementType.Code>) {
  return <div>Add canvas element for {element.id}</div>;
}
