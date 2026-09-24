import type React from 'react';
import { EditorElement, EditorElementType } from '5board.vsc-common';
import { HeadingSettings } from './HeadingSettings';
import { TextSettings } from './TextSettings';
import { CodeSettings } from './CodeSettings';
import { ImageSettings } from './ImageSettings';
import { LineSettings } from './LineSettings';
import { FreehandSettings } from './FreehandSettings';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { RectangleSettings } from './RectangleSettings';
import { CircleSettings } from './CircleSettings';

type SettingsProps<T extends EditorElementType> = {
  element: EditorElement<T>;
};

export default function ElementSettings<ElementType extends EditorElementType>({
  element,
}: {
  element: EditorElement<ElementType>;
}) {
  const Component = SETTINGS_COMPONENTS[element.type] as React.ComponentType<
    SettingsProps<ElementType>
  >;
  const { t } = useLocalization();

  const content = Component ? (
    <Component element={element} />
  ) : (
    <div>
      <p>{t('webview.sidebar-element-settings.unsupportedElement')}</p>
    </div>
  );

  return content;
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
  [EditorElementType.Rectangle]: RectangleSettings,
  [EditorElementType.Circle]: CircleSettings,
  [EditorElementType.Line]: LineSettings,
  [EditorElementType.Freehand]: FreehandSettings,
};
