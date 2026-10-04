import type React from 'react';
import { init } from '../app/init';
import { useEffect } from 'react';
import ElementSettings from '../components/sidebar/elementSettings/ElementSettings';
import { useMessageService } from '../services/MessageService';
import { useLocalization } from '../providers/LocalizationProvider';
import { SidebarShell } from '../components/sidebar/layout/SidebarShell';
import { Button, Divider, Icon } from 'vscrui';
import { useBoardDocument } from '../providers/BoardDocumentProvider';

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

  const handleDelete = () => {
    messages.send({
      type: 'deleteElements',
      ids: selectedElementIds,
    });
  };

  return (
    <SidebarShell>
      {content}
      {primarySelectedElement && (
        <>
          <div className="-mt-2">
            <Divider />
          </div>
          <Button
            appearance="secondary"
            className="justify-center gap-2"
            title={t('webview.sidebar-element-settings.deleteTooltip')}
            onClick={() => handleDelete()}
          >
            <Icon name="trash" className="color-foreground-error" />

            {t('webview.sidebar-element-settings.delete')}
          </Button>
        </>
      )}
    </SidebarShell>
  );
}

init(ElementSettingsSidebar);
