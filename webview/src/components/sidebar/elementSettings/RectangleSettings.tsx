import { EditorElement, EditorElementType } from '5board.vsc-common';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { useMessageService } from '../../../services/MessageService';
import SettingsPanel from '../layout/SettingsPanel';
import SettingsField from '../layout/SettingsField';

type Props = {
  element: EditorElement<EditorElementType.Rectangle>;
};

/**
 * Settings panel for Line elements
 * Allows configuration of stroke properties and arrow heads
 */
export function RectangleSettings({ element }: Props) {
  const { t } = useLocalization();
  const messages = useMessageService();
  const updateStyle = (value: string) => {
    if (!value) {
      return;
    }
    messages.send({
      type: 'updateElement',
      id: element.id,
      changes: {
        style: {
          ...element.style,
        },
      },
    });
  };
  return (
    <>
      <SettingsPanel
        title={t('webview.sidebar-element-settings.headingSettings.title')}
        icon="text-size"
      >
        <SettingsField label={t('webview.sidebar-element-settings.rectangleSettings.title')}>
          {/* ElementStyle: color, backgroundColor=FillColor, opacity, border(color, width, style, radius) */}
          <div onClick={() => updateStyle('test')}></div>
        </SettingsField>
      </SettingsPanel>
    </>
  );
}
