import { EditorElementType } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';

export function ArrowElement({ element }: EditorElementProps<EditorElementType.Arrow>) {
  return <div>Add canvas element for {element.id}</div>;
}
