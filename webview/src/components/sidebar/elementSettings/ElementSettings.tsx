import type React from 'react';
import { EditorElement, EditorElementType } from '5board.vsc-common';
import { HeadingSettings } from './HeadingSettings';
import { TextSettings } from './TextSettings';
import { CodeSettings } from './CodeSettings';
import { ImageSettings } from './ImageSettings';
import { ShapeSettings } from './ShapeSettings';
import { ArrowSettings } from './ArrowSettings';
import { FreehandSettings } from './FreehandSettings';
// import { useLocalization } from '../../../providers/LocalizationProvider';
import { CommonSettings } from './CommonSettings';

type SettingsProps<T extends EditorElementType> = {
  elements: EditorElement<T>[];
};

type SelectionType = EditorElementType | 'mixed';

function getSelectionType(elements: EditorElement[]): SelectionType {
  const type = elements[0].type;

  return elements.every((element) => element.type === type) ? type : 'mixed';
}

export default function ElementSettings<ElementType extends EditorElementType>({
  elements,
}: {
  elements: EditorElement<ElementType>[];
}) {
  const type = getSelectionType(elements);

  if (type === 'mixed') {
    return <CommonSettings elements={elements} />;
  }

  const Component = SETTINGS_COMPONENTS[type] as React.ComponentType<SettingsProps<ElementType>>;

  return <Component elements={elements} />;

  // const { t } = useLocalization();

  // return (
  //   <div>
  //     <p>{t('webview.sidebar-element-settings.unsupportedElement')}</p>
  //   </div>
  // );
}

/**
 * Mapping of editor element types to their corresponding Settings React components.
 */
const SETTINGS_COMPONENTS: {
  [Type in EditorElementType]: React.ComponentType<SettingsProps<Type>>;
} = {
  [EditorElementType.Heading]: HeadingSettings,
  [EditorElementType.Text]: TextSettings,
  [EditorElementType.Code]: CodeSettings,
  [EditorElementType.Image]: ImageSettings,
  [EditorElementType.Shape]: ShapeSettings,
  [EditorElementType.Arrow]: ArrowSettings,
  [EditorElementType.Freehand]: FreehandSettings,
};
