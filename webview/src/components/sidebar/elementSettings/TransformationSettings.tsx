import { Dropdown } from 'vscrui';
import { DEFAULT_GRID_SETTINGS, EditorElement } from '5board.vsc-common';

import { getCommonValue } from './utils/getCommonValue';

import { useLocalization } from '../../../providers/LocalizationProvider';
import { useMessageService } from '../../../services/MessageService';
import { useBoardDocument } from '../../../providers/BoardDocumentProvider';
import SettingsField from '../layout/SettingsField';
import { ELEMENT_INTERACTION_CONFIG } from '../../canvas/elementInteraction/InteractionConfig';

type Props = {
  elements: EditorElement[];
};

type LayoutKey = 'xPos' | 'yPos' | 'width' | 'height' | 'rotation' | 'zIndex';
type BoundingBoxKey = 'xPos' | 'yPos' | 'width' | 'height';

const ROTATION_VALUES = [0, 45, 90, 135, 180, 225, 270, 315];

const rotationOptions = ROTATION_VALUES.map((rotation) => ({
  value: String(rotation),
  label: `${rotation}°`,
}));

export function TransformationSettings({ elements }: Props) {
  const { t } = useLocalization();
  const messages = useMessageService();
  const document = useBoardDocument();

  const selectionBounds = elements.reduce(
    (bounds, element) => ({
      xPos: Math.min(bounds.xPos, element.layout.xPos),
      yPos: Math.min(bounds.yPos, element.layout.yPos),
      right: Math.max(bounds.right, element.layout.xPos + element.layout.width),
      bottom: Math.max(bounds.bottom, element.layout.yPos + element.layout.height),
    }),
    { xPos: Infinity, yPos: Infinity, right: -Infinity, bottom: -Infinity },
  );
  const boundsWidth = selectionBounds.right - selectionBounds.xPos;
  const boundsHeight = selectionBounds.bottom - selectionBounds.yPos;
  const columnCount = document?.content.grid?.columnCount ?? DEFAULT_GRID_SETTINGS.columnCount;
  const maxX = Math.max(0, columnCount - boundsWidth);
  const maxWidth = Math.max(1, columnCount - selectionBounds.xPos);
  const commonRotation = getCommonValue(elements.map((element) => element.layout.rotation ?? 0));

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

  const handleBoundsChange = (key: BoundingBoxKey, value: number) => {
    if (!Number.isFinite(value)) {
      return;
    }

    const currentValue = {
      xPos: selectionBounds.xPos,
      yPos: selectionBounds.yPos,
      width: boundsWidth,
      height: boundsHeight,
    }[key];
    if ((key === 'xPos' && value < 0) || (key === 'width' && value < 1)) {
      return;
    }

    const boundedValue =
      key === 'xPos' ? Math.min(value, maxX) : key === 'width' ? Math.min(value, maxWidth) : value;
    const delta = boundedValue - currentValue;
    if (delta === 0) {
      return;
    }

    messages.send({
      type: 'updateElements',
      changes: elements.map((element) => ({
        id: element.id,
        changes: {
          layout: {
            ...element.layout,
            [key]:
              key === 'width' || key === 'height'
                ? Math.max(1, element.layout[key] + delta)
                : element.layout[key] + delta,
          },
        },
      })),
    });
  };

  const handleRotationChange = (rotation: number) => {
    const delta = commonRotation === undefined ? undefined : rotation - commonRotation;

    messages.send({
      type: 'updateElements',
      changes: elements.map((element) => ({
        id: element.id,
        changes: {
          layout: {
            ...element.layout,
            rotation: delta === undefined ? rotation : (element.layout.rotation ?? 0) + delta,
          },
        },
      })),
    });
  };

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
      <div className="@container -mb-4 w-full">
        <div className="grid grid-cols-1 gap-x-4 @[13rem]:grid-cols-2">
          <SettingsField label={t('webview.sidebar-element-settings.transformation.x')} inline>
            <input
              type="number"
              min={0}
              max={maxX}
              disabled={!canChangeLayout('xPos')}
              className={inputClassName}
              value={selectionBounds.xPos}
              onChange={(event) => handleBoundsChange('xPos', Number(event.target.value))}
            />
          </SettingsField>

          <SettingsField label={t('webview.sidebar-element-settings.transformation.y')} inline>
            <input
              type="number"
              disabled={!canChangeLayout('yPos')}
              className={inputClassName}
              value={selectionBounds.yPos}
              onChange={(event) => handleBoundsChange('yPos', Number(event.target.value))}
            />
          </SettingsField>

          <SettingsField label={t('webview.sidebar-element-settings.transformation.width')} inline>
            <input
              type="number"
              min={1}
              max={maxWidth}
              disabled={!canChangeLayout('width')}
              className={inputClassName}
              value={boundsWidth}
              onChange={(event) => handleBoundsChange('width', Number(event.target.value))}
            />
          </SettingsField>

          <SettingsField label={t('webview.sidebar-element-settings.transformation.height')} inline>
            <input
              type="number"
              disabled={!canChangeLayout('height')}
              className={inputClassName}
              value={boundsHeight}
              onChange={(event) => handleBoundsChange('height', Number(event.target.value))}
            />
          </SettingsField>

          <SettingsField
            label={t('webview.sidebar-element-settings.transformation.rotation')}
            inline
          >
            <div className="min-w-0 flex-1">
              <Dropdown
                className="w-full min-w-0! disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!canChangeLayout('rotation')}
                options={rotationOptions}
                value={commonRotation === undefined ? '' : String(commonRotation)}
                onChange={(value) => {
                  if (!value) {
                    return;
                  }

                  const rotation = typeof value === 'string' ? value : value.value;

                  handleRotationChange(Number(rotation));
                }}
              />
            </div>
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
      </div>
    </SettingsField>
  );
}
