import { useEffect } from 'react';
import { init } from '../app/init';
import ProjectorSettings from '../components/sidebar/ProjectorSettings';
import { SidebarShell } from '../components/sidebar/layout/SidebarShell';
import { useMessageService } from '../services/MessageService';

// Dedicated sidebar view that hosts the projector settings (its own section in the
// activity bar). On mount it asks the extension for the current projector state so
// the controls reflect it.
export default function ProjectorSettingsSidebar() {
  const messages = useMessageService();

  useEffect(() => {
    messages.send({ type: 'ready' }); // request current projector settings state
  }, [messages]);

  return (
    <SidebarShell>
      <ProjectorSettings />
    </SidebarShell>
  );
}

init(ProjectorSettingsSidebar);
