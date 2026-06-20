import { useEffect, useState } from 'react';
import { init } from '../app/init';
import { TranslationKey } from '5board.vsc-common';
import { useLocalization } from '../providers/LocalizationProvider';
import { useMessageService, useOnMessage } from '../services/MessageService';
import { Button } from 'vscrui';
import { SidebarShell } from '../components/sidebar/layout/SidebarShell';

// Placeholder settings to outline what could live in this view later.
// These are non-functional dummies — the labels map to localized strings.
const DUMMY_SETTINGS: { id: string; labelKey: TranslationKey }[] = [
  { id: 'cursorColor', labelKey: 'webview.sidebar.projector.dummies.cursorColor' },
  { id: 'cursorSize', labelKey: 'webview.sidebar.projector.dummies.cursorSize' },
  { id: 'showViewport', labelKey: 'webview.sidebar.projector.dummies.showViewport' },
  { id: 'background', labelKey: 'webview.sidebar.projector.dummies.background' },
];

export default function ProjectorSettingsSidebar() {
  const { t } = useLocalization();
  const messages = useMessageService();
  const [cursorTrackingEnabled, setCursorTrackingEnabled] = useState(true);

  // Ask the extension for the current language and projector settings on load.
  useEffect(() => {
    messages.send({ type: 'ready' });
  }, []);

  useOnMessage((msg) => {
    if (msg.type === 'sidebarSync') {
      setCursorTrackingEnabled(msg.cursorTrackingEnabled);
    }
    if (msg.type === 'cursorTrackingChanged') {
      setCursorTrackingEnabled(msg.enabled);
    }
  });

  // Lets the extension flip cursor tracking; the new state arrives via a message.
  const handleToggleTracking = () => {
    messages.send({ type: 'toggleCursorTracking' });
  };

  return (
    <SidebarShell>
      {/* Cursor tracking — the one working projector setting so far */}
      <section className="flex flex-col gap-2">
        <span className="text-xs opacity-80">{t('webview.sidebar.projector.cursorTracking')}</span>
        <Button
          appearance={cursorTrackingEnabled ? 'primary' : 'secondary'}
          onClick={handleToggleTracking}
        >
          {cursorTrackingEnabled
            ? t('webview.sidebar.projector.on')
            : t('webview.sidebar.projector.off')}
        </Button>
      </section>

      {/* Placeholders for future projector settings */}
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide opacity-70">
          {t('webview.sidebar.projector.moreSettings')}
        </h3>
        {DUMMY_SETTINGS.map((setting) => (
          <div
            key={setting.id}
            className="flex items-center justify-between rounded border border-[var(--vscode-widget-border)] px-2 py-1 opacity-50"
          >
            <span className="text-xs">{t(setting.labelKey)}</span>
            <span className="text-[0.65rem] uppercase tracking-wide">
              {t('webview.sidebar.projector.comingSoon')}
            </span>
          </div>
        ))}
      </section>
    </SidebarShell>
  );
}

init(ProjectorSettingsSidebar);
