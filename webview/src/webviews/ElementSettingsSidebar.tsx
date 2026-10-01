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
import { flattenBoardElements, GroupElement, isGroupElement } from '5board.vsc-common';
import { RectangleGroupIcon } from '@heroicons/react/24/outline';

export default function ElementSettingsSidebar() {
  const messages = useMessageService();
  const { t } = useLocalization();
  const document = useBoardDocument();

  useEffect(() => {
    messages.send({ type: 'ready' });
  }, []);

  const selectedElementIds = document?.content.selectedElementIds ?? [];

  const flatElements = useMemo(
    () => flattenBoardElements(document?.content.elements ?? []),
    [document?.content.elements],
  );
  const selectedElements =
    flatElements.filter((element) => selectedElementIds.includes(element.id)) ?? [];

  const primarySelectedElement =
    flatElements.find((e) => document?.content.primarySelectedElementId === e.id) ?? null;

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

  const selectedIdSet = new Set(selectedElementIds);

  const selectedGroup =
    selectedIdSet.size > 0
      ? document?.content.elements.find(
          (element): element is GroupElement =>
            isGroupElement(element) &&
            element.data.children.length === selectedIdSet.size &&
            element.data.children.every((child) => selectedIdSet.has(child.id)),
        )
      : undefined;

  return (
    <SidebarShell>
      {content}
      {primarySelectedElement && <LayerSettings element={primarySelectedElement} />}
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
      {primarySelectedElement && (
        <Button
          appearance="secondary"
          className="justify-center gap-2"
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
