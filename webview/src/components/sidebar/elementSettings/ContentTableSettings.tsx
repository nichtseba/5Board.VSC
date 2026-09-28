import { EditorElement, EditorElementType } from '5board.vsc-common';
import SettingsPanel from '../layout/SettingsPanel';
import SettingsField from '../layout/SettingsField';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { useMessageService } from '../../../services/MessageService';
import { getCommonValue } from './utils/getCommonValue';

type Props = {
  elements: EditorElement<EditorElementType.TableOfContents>[];
};

export function TableOfContentsSettings({ elements }: Props) {
  const { t } = useLocalization();
  const messages = useMessageService();

  const handleFontSizeChange = (value: string) => {
    const fontSize = Number(value);
    if (!Number.isFinite(fontSize) || fontSize <= 0) return;

    messages.send({
      type: 'updateElements',
      changes: elements.map((element) => ({
        id: element.id,
        changes: {
          data: { ...element.data, fontSize },
        },
      })),
    });
  };

  return (
    <SettingsPanel
      title={t('webview.sidebar-element-settings.tableOfContentsSettings.title')}
      icon="list-unordered"
    >
      <SettingsField label={t('webview.sidebar-element-settings.headingSettings.fontSize')} inline>
        <input
          type="number"
          min={1}
          value={getCommonValue(elements.map((element) => element.data.fontSize)) ?? 14}
          onChange={(e) => handleFontSizeChange(e.target.value)}
          className="w-20 rounded-xs border border-dropdown-border bg-input-background px-2 py-[3px] text-input-foreground [color-scheme:light_dark] focus:border-focus-border focus:outline-none"
        />
      </SettingsField>
    </SettingsPanel>
  );
}
