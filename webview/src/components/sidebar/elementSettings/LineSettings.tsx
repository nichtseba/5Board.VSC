import { EditorElement, EditorElementType, LineElementData } from '5board.vsc-common';
import { Checkbox, Dropdown, DropdownOption } from 'vscrui';
import { useMessageService } from '../../../services/MessageService';
import { useLocalization } from '../../../providers/LocalizationProvider';
import SettingsPanel from '../layout/SettingsPanel';
import SettingsField from '../layout/SettingsField';
import SliderInput from '../components/SliderInput';
import ElementStyleSettings from '../components/ElementStyleSettings';

type Props = {
  element: EditorElement<EditorElementType.Line>;
};

/**
 * Settings panel for Line elements
 * Allows configuration of stroke properties and arrow heads.
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

  const updateStyle = (changes: Partial<typeof element.style>) => {
    messages.send({
      type: 'updateElement',
      id: element.id,
      changes: {
        style: { ...element.style, ...changes },
      },
    });
  };

  const updateHeadType = (
    key: 'headTypeStart' | 'headTypeEnd',
    value: string | DropdownOption | undefined,
  ) => {
    if (value) {
      updateData({
        [key]: (typeof value === 'string' ? value : value.value) as LineElementData[typeof key],
      });
    }
  };

  return (
    <SettingsPanel
      title={t('webview.sidebar-element-settings.lineSettings.title')}
      icon="symbol-line"
    >
      <ElementStyleSettings
        style={element.style}
        onChange={updateStyle}
        editableProperties={['opacity', 'borderColor', 'borderWidth', 'borderStyle']}
      />

      <SettingsField label={t('webview.sidebar-element-settings.lineSettings.symbols')}>
        <div className="grid grid-cols-2 gap-3">
          <SettingsField label={t('webview.sidebar-element-settings.lineSettings.startHead')}>
            <Dropdown
              options={headOptions(t)}
              value={data.headTypeStart ?? 'none'}
              onChange={(value) => updateHeadType('headTypeStart', value)}
            />
          </SettingsField>
          <SettingsField label={t('webview.sidebar-element-settings.lineSettings.endHead')}>
            <Dropdown
              options={headOptions(t)}
              value={data.headTypeEnd ?? 'none'}
              onChange={(value) => updateHeadType('headTypeEnd', value)}
            />
          </SettingsField>
        </div>
        <SliderInput
          label={t('webview.sidebar-element-settings.lineSettings.headSize')}
          value={data.headSize ?? 6}
          min={1}
          max={20}
          unit="px"
          onChange={(value) => updateData({ headSize: value })}
        />
        <Checkbox
          checked={data.headFill ?? true}
          onChange={(checked) => updateData({ headFill: checked })}
        >
          {t('webview.sidebar-element-settings.lineSettings.headFill')}
        </Checkbox>
      </SettingsField>
    </SettingsPanel>
  );
}

function headOptions(t: ReturnType<typeof useLocalization>['t']) {
  return [
    { value: 'none', label: t('webview.sidebar-element-settings.lineSettings.headNone') },
    { value: 'arrow', label: t('webview.sidebar-element-settings.lineSettings.headArrow') },
    { value: 'circle', label: t('webview.sidebar-element-settings.lineSettings.headCircle') },
    { value: 'square', label: t('webview.sidebar-element-settings.lineSettings.headSquare') },
  ];
}
