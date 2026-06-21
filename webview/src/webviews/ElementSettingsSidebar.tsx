import type React from 'react';
import { init } from '../app/init';
import { useEffect, useState } from 'react';
import { BoardDocument } from '5board.vsc-common';
import ElementSettings from '../components/sidebar/elementSettings/ElementSettings';
import { useMessageService, useOnMessage } from '../services/MessageService';
import { useLocalization } from '../providers/LocalizationProvider';
import { SidebarShell } from '../components/sidebar/layout/SidebarShell';
import { Button, Icon } from 'vscrui';

export default function ElementSettingsSidebar() {
  const messages = useMessageService();
  const { t } = useLocalization();
  const [document, setDocument] = useState<BoardDocument | null>(null);

  const selectedElement =
    document?.content.elements.find((e) => e.id === document.content.selectedElementId) ?? null;

  useEffect(() => {
    messages.send({ type: 'ready' });
  }, []);

  useOnMessage((msg) => {
    if (msg.type === 'initSidebar' || msg.type === 'updateDocument') {
      setDocument(msg.document);
    }
  });

  let content: React.ReactNode;
  if (!selectedElement) {
    content = (
      <div>
        <p>{t('webview.sidebar-element-settings.noElementSelected')}</p>
      </div>
    );
  } else {
    content = <ElementSettings element={selectedElement} />;
  }

  return (
    <SidebarShell>
      {content}
      {selectedElement && (
        <Button
          className="justify-center gap-2"
          onClick={() =>
            messages.send({
              type: 'deleteElement',
              id: selectedElement.id,
            })
          }
        >
          {t('webview.sidebar-element-settings.delete')}
          <Icon name="trash" color="color-editor-error-foreground" />
        </Button>
      )}
    </SidebarShell>
  );
}

init(ElementSettingsSidebar);
