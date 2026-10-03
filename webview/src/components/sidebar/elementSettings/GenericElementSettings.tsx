import { EditorElement, ElementDisplay } from '5board.vsc-common';
import SettingsField from '../layout/SettingsField';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { Checkbox, TextField } from 'vscrui';
import { useMessageService } from '../../../services/MessageService';
import { useCallback } from 'react';
export default function GenericElementSettings({ element }: { element: EditorElement }) {
  const { t } = useLocalization();
  const messages = useMessageService();
  const updateElementDisplay = useCallback(
    (changes: Partial<ElementDisplay>) => {
      messages.send({
        type: 'updateElements',
        changes: [
          {
            id: element.id,
            changes: { display: { ...element.display, ...changes } },
          },
        ],
      });
    },
    [element.id, element.display, messages],
  );
  const updateElementName = useCallback(
    (name: string) => {
      messages.send({
        type: 'updateElements',
        changes: [{ id: element.id, changes: { name } }],
      });
    },
    [element.id, messages],
  );
  return (
    <>
      <SettingsField label={t('webview.sidebar-element-settings.name')}>
        <TextField value={element.name ?? ''} onChange={(value) => updateElementName(value)} />
      </SettingsField>
      <section className="mb-4">
        <h3 className="mb-3 text-sm font-semibold">
          {t('webview.sidebar-element-settings.visibility')}
        </h3>
        <SettingsField label={t('webview.sidebar-element-settings.visible')} inline>
          <Checkbox
            checked={element.display.visible}
            onChange={(checked) => updateElementDisplay({ visible: checked })}
          />
        </SettingsField>
        <SettingsField label={t('webview.sidebar-element-settings.speakerNote')} inline>
          <Checkbox
            checked={element.display.speakerNote}
            onChange={(checked) => updateElementDisplay({ speakerNote: checked })}
          />
        </SettingsField>
        <SettingsField label={t('webview.sidebar-element-settings.hideInExport')} inline>
          <Checkbox
            checked={element.display.excludeFromExport}
            onChange={(checked) => updateElementDisplay({ excludeFromExport: checked })}
          />
        </SettingsField>
      </section>
    </>
  );
}
