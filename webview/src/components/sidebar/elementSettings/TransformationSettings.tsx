import { Dropdown } from 'vscrui';
import { EditorElement } from '5board.vsc-common';

import { getCommonValue } from './utils/getCommonValue';

import { useLocalization } from '../../../providers/LocalizationProvider';
import { useMessageService } from '../../../services/MessageService';
import SettingsField from '../layout/SettingsField';
import { ELEMENT_INTERACTION_CONFIG } from '../../canvas/elementInteraction/InteractionConfig';

type Props = {
  elements: EditorElement[];
};

type LayoutKey = 'xPos' | 'yPos' | 'width' | 'height' | 'rotation' | 'zIndex';

const ROTATION_VALUES = [0, 45, 90, 135, 180, 225, 270, 315];

const rotationOptions = ROTATION_VALUES.map((rotation) => ({
  value: String(rotation),
  label: `${rotation}°`,
}));

export function TransformationSettings({ elements }: Props) {
  const { t } = useLocalization();
  const messages = useMessageService();

  const handleLayoutChange = (key: LayoutKey, value: number) => {
    messages.send({
      type: 'updateElements',
      changes: elements.map((element) => ({
        id: element.id,
        changes: {
          layout: {
            ...element.layout,
            [key]: value,
          },
        },
      })),
    });
  };

  const getLayoutValue = <K extends keyof EditorElement['layout']>(key: K) =>
    getCommonValue(elements.map((element) => element.layout[key]));

  const canChangeLayout = (key: LayoutKey) =>
    getCommonValue(
      elements.map((element) => {
        const interaction = ELEMENT_INTERACTION_CONFIG[element.type];

        switch (key) {
          case 'xPos':
            return interaction.draggable && interaction.dragDirection !== 'vertical';
          case 'yPos':
            return (
              interaction.draggable &&
              (interaction.dragDirection === 'vertical' || interaction.dragDirection === 'free')
            );
          case 'width':
          case 'height':
            return interaction.resizable;
          case 'rotation':
            return interaction.rotatable;
          case 'zIndex':
            return true;
        }
      }),
    ) === true;

  const inputClassName =
    'h-[26px] flex-1 min-w-0 rounded-xs border border-dropdown-border bg-input-background px-[9px] text-[length:var(--vscode-font-size)] text-input-foreground [color-scheme:light_dark] outline-none focus:border-focus-border disabled:cursor-not-allowed disabled:opacity-40 [&::-webkit-inner-spin-button]:opacity-100 [&::-webkit-outer-spin-button]:opacity-100';

  return (
    <SettingsField label={t('webview.sidebar-element-settings.transformation.title')}>
      <div className="grid grid-cols-2 gap-x-4">
        <SettingsField label={t('webview.sidebar-element-settings.transformation.x')} inline>
          <input
            type="number"
            disabled={!canChangeLayout('xPos')}
            className={inputClassName}
            value={getLayoutValue('xPos') ?? ''}
            onChange={(event) => handleLayoutChange('xPos', Number(event.target.value))}
          />
        </SettingsField>

        <SettingsField label={t('webview.sidebar-element-settings.transformation.y')} inline>
          <input
            type="number"
            disabled={!canChangeLayout('yPos')}
            className={inputClassName}
            value={getLayoutValue('yPos') ?? ''}
            onChange={(event) => handleLayoutChange('yPos', Number(event.target.value))}
          />
        </SettingsField>

        <SettingsField label={t('webview.sidebar-element-settings.transformation.width')} inline>
          <input
            type="number"
            disabled={!canChangeLayout('width')}
            className={inputClassName}
            value={getLayoutValue('width') ?? ''}
            onChange={(event) => handleLayoutChange('width', Number(event.target.value))}
          />
        </SettingsField>

        <SettingsField label={t('webview.sidebar-element-settings.transformation.height')} inline>
          <input
            type="number"
            disabled={!canChangeLayout('height')}
            className={inputClassName}
            value={getLayoutValue('height') ?? ''}
            onChange={(event) => handleLayoutChange('height', Number(event.target.value))}
          />
        </SettingsField>

        <SettingsField label={t('webview.sidebar-element-settings.transformation.rotation')} inline>
          <Dropdown
            className="min-w-0 flex-1 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canChangeLayout('rotation')}
            options={rotationOptions}
            value={String(getLayoutValue('rotation') ?? 0)}
            onChange={(value) => {
              if (!value) {
                return;
              }

              const rotation = typeof value === 'string' ? value : value.value;

              handleLayoutChange('rotation', Number(rotation));
            }}
          />
        </SettingsField>

        <SettingsField label={t('webview.sidebar-element-settings.transformation.zIndex')} inline>
          <input
            type="number"
            disabled={!canChangeLayout('zIndex')}
            className={inputClassName}
            value={getCommonValue(elements.map((element) => element.layout.zIndex ?? 0)) ?? ''}
            onChange={(event) => handleLayoutChange('zIndex', Number(event.target.value))}
          />
        </SettingsField>
      </div>
    </SettingsField>
  );
}
