import { EditorElement, EditorElementType, LineElementData } from '5board.vsc-common';
import { useMessageService } from '../../../services/MessageService';
import { useLocalization } from '../../../providers/LocalizationProvider';
import SettingsPanel from '../layout/SettingsPanel';
import SettingsField from '../layout/SettingsField';

type Props = {
  element: EditorElement<EditorElementType.Line>;
};

/**
 * Settings panel for Line elements
 * Allows configuration of stroke properties and arrow heads
 */
export function LineSettings({ element }: Props) {
  const messages = useMessageService();
  const { t } = useLocalization();

  const data = element.data as LineElementData;

  const updateData = (updates: Partial<LineElementData>) => {
    messages.send({
      type: 'updateElement',
      id: element.id,
      changes: {
        data: { ...data, ...updates },
      },
    });
  };
  /*const updateStyle = (value: string) => {
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
  };*/

  return (
    <>
      <SettingsPanel
        title={t('webview.sidebar-element-settings.lineSettings.title')}
        icon="text-size"
      >
        {/* ElementStyle: color, backgroundColor=FillColor, opacity, border(color, width, style, radius) */}

        <SettingsField label={t('webview.sidebar-element-settings.lineSettings.symbols')}>
          <div>
            <label className="block text-sm font-semibold mb-2">Start Head</label>
            <select
              value={data.headTypeStart || 'none'}
              onChange={(e) =>
                updateData({ headTypeStart: e.target.value as LineElementData['headTypeStart'] })
              }
              className="w-full px-2 py-1 border border-gray-300 rounded"
            >
              <option value="none">None</option>
              <option value="arrow">Arrow</option>
              <option value="circle">Circle</option>
              <option value="square">Square</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">End Head</label>
            <select
              value={data.headTypeEnd || 'none'}
              onChange={(e) =>
                updateData({ headTypeEnd: e.target.value as LineElementData['headTypeStart'] })
              }
              className="w-full px-2 py-1 border border-gray-300 rounded"
            >
              <option value="none">None</option>
              <option value="arrow">Arrow</option>
              <option value="circle">Circle</option>
              <option value="square">Square</option>
            </select>
          </div>
        </SettingsField>
      </SettingsPanel>
    </>
  );
}
