import { EditorElementType, type EditorElement } from '5board.vsc-common';

import MixedTextSettings from './MixedTextSettings';
import MixedHeadingSettings from './MixedHeadingSettings';
import MixedCommonSettings from './MixedCommonSettings';

interface MixedElementsSettingsProps {
  elements: EditorElement<EditorElementType>[];
}

export function areElementsOfType<T extends EditorElementType>(
  elements: EditorElement<EditorElementType>[],
  type: T,
): elements is EditorElement<T>[] {
  return elements.every((element) => element.type === type);
}

export default function MixedElementsSettings({ elements }: MixedElementsSettingsProps) {
  if (elements.length === 0) {
    return null;
  }

  if (areElementsOfType(elements, EditorElementType.Text)) {
    return <MixedTextSettings elements={elements} />;
  }
  if (areElementsOfType(elements, EditorElementType.Heading)) {
    return <MixedHeadingSettings elements={elements} />;
  }

  return <MixedCommonSettings elements={elements} />;
}
