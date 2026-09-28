import { Dropdown } from 'vscrui';
import { EditorElement } from '5board.vsc-common';

import { getCommonValue } from './utils/getCommonValue';

import { useMessageService } from '../../../services/MessageService';
import SettingsField from '../layout/SettingsField';

type Props = {
  elements: EditorElement[];
};

type LayoutKey = 'xPos' | 'yPos' | 'width' | 'height' | 'rotation';

const ROTATION_VALUES = [0, 45, 90, 135, 180, 225, 270, 315];

const rotationOptions = ROTATION_VALUES.map((rotation) => ({
  value: String(rotation),
  label: `${rotation}°`,
}));

export function CommonSettings({ elements }: Props) {
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

  const inputClassName =
    'h-7 w-full min-w-0 rounded border border-input bg-background px-2 text-sm text-foreground outline-none focus:border-focus';

  return (
    <div className="grid grid-cols-2 gap-x-4">
      <SettingsField label="X:" inline>
        <input
          type="number"
          className={inputClassName}
          value={getLayoutValue('xPos') ?? ''}
          onChange={(event) => handleLayoutChange('xPos', Number(event.target.value))}
        />
      </SettingsField>

      <SettingsField label="Y:" inline>
        <input
          type="number"
          className={inputClassName}
          value={getLayoutValue('yPos') ?? ''}
          onChange={(event) => handleLayoutChange('yPos', Number(event.target.value))}
        />
      </SettingsField>

      <SettingsField label="B:" inline>
        <input
          type="number"
          className={inputClassName}
          value={getLayoutValue('width') ?? ''}
          onChange={(event) => handleLayoutChange('width', Number(event.target.value))}
        />
      </SettingsField>

      <SettingsField label="H:" inline>
        <input
          type="number"
          className={inputClassName}
          value={getLayoutValue('height') ?? ''}
          onChange={(event) => handleLayoutChange('height', Number(event.target.value))}
        />
      </SettingsField>

      <div className="col-span-2">
        <SettingsField label="R:" inline>
          <Dropdown
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
      </div>
    </div>
  );
}
