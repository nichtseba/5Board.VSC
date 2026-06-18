import type React from 'react';
import { init } from '../app/init';
import { useEffect } from 'react';
import { EditorElement } from '5board.vsc-common';
import ElementSettings from '../components/sidebar/elementSettings/ElementSettings';
import { useMessageService } from '../services/MessageService';
import { useLocalization } from '../providers/LocalizationProvider';
import { SidebarShell } from '../components/sidebar/layout/SidebarShell';

export default function ElementSettingsSidebar() {
  const messages = useMessageService();
  const { t } = useLocalization();
  // Todo: wire up the real selected element from the extension (needs selection + edit infra).
  const selectedElement: EditorElement | null = null;

  useEffect(() => {
    messages.send({ type: 'ready' });
  }, []);

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
