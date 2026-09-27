import { EditorElement, EditorElementType } from '5board.vsc-common';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { useMessageService } from '../../../services/MessageService';
import SettingsPanel from '../layout/SettingsPanel';
import ElementStyleSettings from '../components/ElementStyleSettings';

type Props = {
  element: EditorElement<EditorElementType.Circle>;
};

export function CircleSettings({ element }: Props) {
  const { t } = useLocalization();
  const messages = useMessageService();

  const updateStyle = (changes: Partial<typeof element.style>) => {
    messages.send({
      type: 'updateElement',
      id: element.id,
      changes: {
        style: { ...element.style, ...changes },
      },
    });
  };

  return (
    <SettingsPanel
      title={t('webview.sidebar-element-settings.circleSettings.title')}
      icon="symbol-color"
    >
      <ElementStyleSettings
        style={element.style}
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
