import { ArrayOrValue, ensureArray } from '../util';
import EditorElement from './EditorElement';

export type EditorCanvasProps = {
  children?: ArrayOrValue<React.ReactElement<typeof EditorElement>>;
};

export default function EditorCanvas({ children }: EditorCanvasProps) {
  children = ensureArray(children);
  return <>{children}</>;
}
