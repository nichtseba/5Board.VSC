import { EditorElement, EditorElementType, LineElementData } from '5board.vsc-common';
import { Checkbox, Divider, Dropdown, DropdownOption } from 'vscrui';
import { useMessageService } from '../../../services/MessageService';
import { useLocalization } from '../../../providers/LocalizationProvider';
import SettingsPanel from '../layout/SettingsPanel';
import SettingsField from '../layout/SettingsField';
import SliderInput from '../components/SliderInput';
import ElementStyleSettings from '../components/ElementStyleSettings';
import { getCommonElementStyle } from './utils/getCommonElementStyle';
import { getCommonLineData } from './utils/getCommonLineData';
import { CommonSettings } from './CommonSettings';
import GenericElementSettings from './GenericElementSettings';

type Props = {
  elements: EditorElement<EditorElementType.Line>[];
};

/**
 * Settings panel for Line elements
 * Allows configuration of stroke properties and arrow heads.
 */
export function LineSettings({ elements }: Props) {
  const messages = useMessageService();
  const { t } = useLocalization();

  const commonElementStyle = getCommonElementStyle(elements);
  const commonLineData = getCommonLineData(elements);

  const hasHead =
    (commonLineData.headTypeStart ?? 'none') !== 'none' ||
    (commonLineData.headTypeEnd ?? 'none') !== 'none';

  const updateData = (updates: Partial<LineElementData>) => {
    messages.send({
      type: 'updateElements',
      changes: elements.map((element) => ({
        id: element.id,
        changes: {
          data: { ...element.data, ...updates },
        },
      })),
    });
  };

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
      <GenericElementSettings element={elements[0]} />
      <Divider />
      <CommonSettings elements={elements} />
      <Divider />
      <ElementStyleSettings
        style={commonElementStyle}
        onChange={updateStyle}
        editableProperties={['opacity', 'borderColor', 'borderWidth', 'borderStyle']}
      />

      <SettingsField>
        <div className="grid grid-cols-2 gap-3">
          <SettingsField label={t('webview.sidebar-element-settings.lineSettings.startHead')}>
            <Dropdown
              options={headOptions(t)}
              value={commonLineData.headTypeStart ?? 'none'}
              onChange={(value) => updateHeadType('headTypeStart', value)}
            />
          </SettingsField>
          <SettingsField label={t('webview.sidebar-element-settings.lineSettings.endHead')}>
            <Dropdown
              options={headOptions(t)}
              value={commonLineData.headTypeEnd ?? 'none'}
              onChange={(value) => updateHeadType('headTypeEnd', value)}
            />
          </SettingsField>
        </div>
        {hasHead && (
          <>
            <SliderInput
              label={t('webview.sidebar-element-settings.lineSettings.headSize')}
              value={commonLineData.headSize ?? 6}
              min={1}
              max={20}
              unit="px"
              onChange={(value) => updateData({ headSize: value })}
            />
            <Checkbox
              checked={commonLineData.headFill ?? true}
              onChange={(checked) => updateData({ headFill: checked })}
            >
              {t('webview.sidebar-element-settings.lineSettings.headFill')}
            </Checkbox>
          </>
        )}
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
