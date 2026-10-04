import { EditorElement, EditorElementType } from '5board.vsc-common';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { useMessageService } from '../../../services/MessageService';
import SettingsPanel from '../layout/SettingsPanel';
import ElementStyleSettings from '../components/ElementStyleSettings';
import { getCommonElementStyle } from './utils/getCommonElementStyle';
import { Divider } from 'vscrui';
import { TransformationSettings } from './TransformationSettings';
import GenericElementSettings from './GenericElementSettings';

type Props = {
  elements: EditorElement<EditorElementType.Rectangle>[];
};

export function RectangleSettings({ elements }: Props) {
  const { t } = useLocalization();
  const messages = useMessageService();
  const commonElementStyle = getCommonElementStyle(elements);

  const updateStyle = (changes: Partial<(typeof elements)[number]['style']>) => {
    messages.send({
      type: 'updateElements',
      changes: elements.map((element) => ({
        id: element.id,
        changes: {
          style: { ...element.style, ...changes },
        },
      })),
    });
  };

  return (
    <SettingsPanel
      title={t('webview.sidebar-element-settings.rectangleSettings.title')}
      icon="symbol-color"
    >
      <GenericElementSettings element={elements[0]} />
      <Divider />
      <TransformationSettings elements={elements} />
      <Divider />
      <ElementStyleSettings
        style={commonElementStyle}
        onChange={updateStyle}
        allowNone
        editableProperties={[
          'backgroundColor',
          'opacity',
          'borderColor',
          'borderWidth',
          'borderRadius',
          'borderStyle',
        ]}
      />
    </SettingsPanel>
  );
}
