import { EditorElement, EditorElementType } from '5board.vsc-common';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { useMessageService } from '../../../services/MessageService';
import SettingsPanel from '../layout/SettingsPanel';
import ElementStyleSettings from '../components/ElementStyleSettings';
import { getCommonElementStyle } from './utils/getCommonElementStyle';

type Props = {
  elements: EditorElement<EditorElementType.Circle>[];
};

export function CircleSettings({ elements }: Props) {
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
      title={t('webview.sidebar-element-settings.circleSettings.title')}
      icon="symbol-color"
    >
      <ElementStyleSettings
        style={commonElementStyle}
        onChange={updateStyle}
        allowNone
        editableProperties={[
          'backgroundColor',
          'opacity',
          'borderColor',
          'borderWidth',
          'borderStyle',
        ]}
      />
    </SettingsPanel>
  );
}
