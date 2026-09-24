import { DEFAULT_WEBVIEW_SETTINGS, WebviewSettings } from '5board.vsc-common';
import { createContext, useContext, useState } from 'react';
import { useOnMessage } from '../services/MessageService';

const SettingsContext = createContext<WebviewSettings>(DEFAULT_WEBVIEW_SETTINGS);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<WebviewSettings>(DEFAULT_WEBVIEW_SETTINGS);

  useOnMessage((message) => {
    if (message.type === 'settingsChanged') {
      setSettings(message.settings);
    }
  });

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}

export function useSettings(): WebviewSettings {
  return useContext(SettingsContext);
}
