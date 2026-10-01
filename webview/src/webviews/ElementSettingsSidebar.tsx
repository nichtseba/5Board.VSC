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
import { flattenBoardElements } from '5board.vsc-common';

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

  return (
    <SidebarShell>
      {content}
      {primarySelectedElement && <LayerSettings element={primarySelectedElement} />}
      {selectedElements.length >= 2 && (
        <Button
          appearance="secondary"
          className="justify-center gap-2"
          onClick={() =>
            messages.send({
              type: 'groupElements',
              ids: selectedElementIds,
            })
          }
        >
          <Icon name="layers" />
          {t('webview.sidebar-element-settings.group')}
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
