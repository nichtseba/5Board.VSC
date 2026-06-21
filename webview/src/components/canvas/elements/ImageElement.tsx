import { EditorElementType } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';

export function ImageElement({ element }: EditorElementProps<EditorElementType.Image>) {
  return <div>{element.type}</div>;
}
