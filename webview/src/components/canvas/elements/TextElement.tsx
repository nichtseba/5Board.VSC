import { EditorElementType } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';

/**
 * Renders a text element.
 */
export function TextElement({ element }: EditorElementProps<EditorElementType.Text>) {
  return <div className="whitespace-pre-wrap">{element.data.content}</div>;
}
