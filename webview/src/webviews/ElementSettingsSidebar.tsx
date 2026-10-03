import type React from 'react';
import { init } from '../app/init';
import { useEffect, useMemo } from 'react';
import ElementSettings from '../components/sidebar/elementSettings/ElementSettings';
import { LayerSettings } from '../components/sidebar/elementSettings/LayerSettings';
import { useMessageService } from '../services/MessageService';
import { useLocalization } from '../providers/LocalizationProvider';
import { SidebarShell } from '../components/sidebar/layout/SidebarShell';
import { Button, Icon } from 'vscrui';
import { useBoardDocument } from '../providers/BoardDocumentProvider';
import {
  findBoardElementById,
  flattenBoardElements,
  getLeafElementIds,
  isGroupElement,
} from '5board.vsc-common';
import { RectangleGroupIcon } from '@heroicons/react/24/outline';

export default function ElementSettingsSidebar() {
  const messages = useMessageService();
  const { t } = useLocalization();
  const document = useBoardDocument();

  useEffect(() => {
    messages.send({ type: 'ready' });
  }, []);
  const elements = document?.content.elements ?? [];
  const flatElements = useMemo(() => flattenBoardElements(elements), [elements]);
  const selectedElementIds = document?.content.selectedElementIds ?? [];
  const selectedLeafIds = selectedElementIds.flatMap((id) => {
    const selected = findBoardElementById(elements, id);
    return selected ? getLeafElementIds([selected]) : [];
  });

  const selectedElements =
    flatElements.filter((element) => selectedLeafIds.includes(element.id)) ?? [];

  let content: React.ReactNode;
  if (selectedElements.length === 0) {
    content = (
      <div>
        <p>{t('webview.sidebar-element-settings.noElementSelected')}</p>
      </div>
    );
  } else {
    content = <ElementSettings elements={selectedElements} />;
  }

  const handleDelete = () => {
    messages.send({
      type: 'deleteElements',
      ids: selectedElementIds,
    });
  };

  const selectedElement =
    selectedElementIds.length === 1
      ? findBoardElementById(elements, selectedElementIds[0])
      : undefined;

  const selectedGroup =
    selectedElement && isGroupElement(selectedElement) ? selectedElement : undefined;

  return (
    <SidebarShell>
      {content}
      {selectedElements.length > 0 && <LayerSettings elements={selectedElements} />}
      {(selectedGroup || selectedElements.length >= 2) && (
        <Button
          appearance="secondary"
          className="justify-center gap-2"
          onClick={() => {
            if (selectedGroup) {
              messages.send({
                type: 'ungroupElements',
                id: selectedGroup.id,
              });
            } else {
              messages.send({
                type: 'groupElements',
                ids: selectedElementIds,
              });
            }
          }}
        >
          <RectangleGroupIcon className="size-4" />
          {selectedGroup
            ? t('webview.sidebar-element-settings.ungroup')
            : t('webview.sidebar-element-settings.group')}
        </Button>
      )}
      {selectedElements.length > 0 && (
        <Button
          appearance="secondary"
          className="justify-center gap-2"
          title={t('webview.sidebar-element-settings.deleteTooltip')}
          onClick={() => handleDelete()}
        >
          <Icon name="trash" className="color-foreground-error" />

          {t('webview.sidebar-element-settings.delete')}
        </Button>
      )}
    </SidebarShell>
  );
}

init(ElementSettingsSidebar);
