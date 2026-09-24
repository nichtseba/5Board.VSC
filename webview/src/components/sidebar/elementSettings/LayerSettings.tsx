import { EditorElement, EditorElementType } from '5board.vsc-common';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { useMessageService } from '../../../services/MessageService';
import SettingsField from '../layout/SettingsField';

type Props = {
  element: EditorElement<EditorElementType>;
};

// Stacking order — shared across all element types, rendered once regardless of type.
export function LayerSettings({ element }: Props) {
  const { t } = useLocalization();
  const messages = useMessageService();

  const updateZIndex = (zIndex: number) => {
    messages.send({
      type: 'updateElement',
      id: element.id,
      changes: { layout: { ...element.layout, zIndex } },
    });
  };

  return (
    <SettingsField label={t('webview.sidebar-element-settings.layer')} inline>
      <input
        type="number"
        value={element.layout.zIndex ?? 0}
        onChange={(e) => updateZIndex(Number(e.target.value))}
        className="w-20 rounded-xs border border-dropdown-border bg-input-background px-2 py-[3px] text-input-foreground [color-scheme:light_dark] focus:border-focus-border focus:outline-none"
      />
    </SettingsField>
  );
}
