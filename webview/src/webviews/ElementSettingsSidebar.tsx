import type React from 'react';
import { init } from '../app/init';
import { useEffect } from 'react';
import ElementSettings from '../components/sidebar/elementSettings/ElementSettings';
import { useMessageService } from '../services/MessageService';
import { useLocalization } from '../providers/LocalizationProvider';
import { SidebarShell } from '../components/sidebar/layout/SidebarShell';
import { Button, Icon } from 'vscrui';
import { useBoardDocument } from '../providers/BoardDocumentProvider';
import { BoardElement } from '5board.vsc-common';

export default function ElementSettingsSidebar() {
  const messages = useMessageService();
  const { t } = useLocalization();
  const document = useBoardDocument();

  useEffect(() => {
    messages.send({ type: 'ready' });
  }, []);

  const selectedElementIds = document?.content.selectedElementIds ?? [];

  const selectedElements =
    document?.content.elements.filter((element) => selectedElementIds.includes(element.id)) ?? [];

  const primarySelectedElement =
    document?.content.elements.find((e) => document.content.primarySelectedElementId === e.id) ??
    null;

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

  const handleDelete = (selectedElement: BoardElement) => {
    messages.send({
      type: 'deleteElement',
      id: selectedElement.id,
    });
  };

  return (
    <SidebarShell>
      {content}
      {primarySelectedElement && (
        <Button
          appearance="secondary"
          className="justify-center gap-2"
          onClick={() => handleDelete(primarySelectedElement)}
        >
          <Icon name="trash" className="color-foreground-error" />

          {t('webview.sidebar-element-settings.delete')}
        </Button>
      )}
    </SidebarShell>
  );
}

init(ElementSettingsSidebar);
