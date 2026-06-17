import type React from 'react';
import { init } from '../app/init';
import { useEffect } from 'react';
import { EditorElement, EditorElementType } from '5board.vsc-common';
import ElementSettings from '../components/sidebar/elementSettings/ElementSettings';
import { useMessageService } from '../services/MessageService';
import { useLocalization } from '../providers/LocalizationProvider';
import { SidebarShell } from '../components/sidebar/layout/SidebarShell';

export default function ElementSettingsSidebar() {
  const messages = useMessageService();
  const { t } = useLocalization();
  const selectedElement: EditorElement = {
    id: 'code-test-1',
    type: EditorElementType.Code,
    data: {
      codeBlockId: 'test-block-1',
      fileName: 'Student.java',
      language: 'java',
      content: '',
    },
    layout: {
      xPos: 0,
      yPos: 0,
      width: 0,
      height: 0,
    },
    style: {
      visible: true,
    },
  }; // Todo: replace with real data from extension

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
