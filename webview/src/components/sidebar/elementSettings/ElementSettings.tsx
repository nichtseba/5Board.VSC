import type React from 'react';
import { EditorElement, EditorElementType } from '5board.vsc-common';
import { HeadingSettings } from './HeadingSettings';
import { TextSettings } from './TextSettings';
import { CodeSettings } from './CodeSettings';
import { ImageSettings } from './ImageSettings';
import { ShapeSettings } from './ShapeSettings';
import { ArrowSettings } from './ArrowSettings';
import { useLocalization } from '../../../providers/LocalizationProvider';
import GenericElementSettings from './GenericElementSettings';

type SettingsProps<T extends EditorElementType> = {
  element: EditorElement<T>;
};

export default function ElementSettings<ElementType extends EditorElementType>({
  element,
}: {
  element: EditorElement<ElementType>;
}) {
  const Component =
    (SETTINGS_COMPONENTS[element.type] as React.ComponentType<SettingsProps<ElementType>>) ??
    UnsupportedElementSettings;

  return (
    <>
      <GenericElementSettings element={element} />
      <Component element={element} />
    </>
  );
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
};

function UnsupportedElementSettings() {
  const { t } = useLocalization();
  return (
    <div>
      <p>{t('webview.sidebar-element-settings.unsupportedElement')}</p>
    </div>
  );
}
