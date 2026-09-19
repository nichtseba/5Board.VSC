import { EditorElement, EditorElementType } from '5board.vsc-common';

interface MixedHeadingSettingsProps {
  elements: EditorElement<EditorElementType.Heading>[];
}

export default function MixedHeadingSettings({}: MixedHeadingSettingsProps) {
  return <div>MixedHeadingSettings</div>;
}
