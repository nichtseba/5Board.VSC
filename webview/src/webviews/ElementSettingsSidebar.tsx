import type React from 'react';
import { init } from '../app/init';
import { useEffect, useState } from 'react';
import { BoardDocument } from '5board.vsc-common';
import ElementSettings from '../components/sidebar/elementSettings/ElementSettings';
import { useMessageService, useOnMessage } from '../services/MessageService';
import { useLocalization } from '../providers/LocalizationProvider';
import { SidebarShell } from '../components/sidebar/layout/SidebarShell';

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

  return <SidebarShell>{content}</SidebarShell>;
}

init(ElementSettingsSidebar);
