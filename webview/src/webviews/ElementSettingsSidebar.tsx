import type React from 'react';
import { init } from '../app/init';
import { useEffect } from 'react';
import ElementSettings from '../components/sidebar/elementSettings/ElementSettings';
import { useMessageService } from '../services/MessageService';
import { useLocalization } from '../providers/LocalizationProvider';
import { SidebarShell } from '../components/sidebar/layout/SidebarShell';
import { useBoardDocument } from '../providers/BoardDocumentProvider';

export default function ElementSettingsSidebar() {
  const messages = useMessageService();
  const { t } = useLocalization();
  const document = useBoardDocument();

  const selectedElement =
    document?.content.elements.find((e) => e.id === document.content.selectedElementId) ?? null;

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
