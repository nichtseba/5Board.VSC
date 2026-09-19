import { EditorElement, EditorElementType } from '5board.vsc-common';

interface MixedTextSettingsProps {
  elements: EditorElement<EditorElementType.Text>[];
}

export default function MixedTextSettings({}: MixedTextSettingsProps) {
  return <div>MixedTextSettings</div>;
}
