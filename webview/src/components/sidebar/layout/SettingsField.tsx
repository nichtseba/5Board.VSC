import { createContext, useContext } from 'react';
import { Label } from 'vscrui';

type Props = {
  label?: string;
  children: React.ReactNode;
  inline?: boolean;
};

const SettingsFieldDepthContext = createContext(0);

export default function SettingsField({ label, children, inline = false }: Props) {
  const depth = useContext(SettingsFieldDepthContext);
  const nestedLabelStyle =
    depth > 0 ? { fontSize: '12px', color: 'var(--vscode-descriptionForeground)' } : undefined;

  if (inline) {
    return (
      <SettingsFieldDepthContext.Provider value={depth + 1}>
        <div className="mb-4 flex items-center gap-1">
          <Label className="w-4 shrink-0 whitespace-nowrap text-right" style={nestedLabelStyle}>
            {label}
          </Label>

          {children}
        </div>
      </SettingsFieldDepthContext.Provider>
    );
  }

  return (
    <SettingsFieldDepthContext.Provider value={depth + 1}>
      <div className="flex flex-col gap-2 mb-4">
        {label && <Label style={nestedLabelStyle}>{label}</Label>}

        {children}
      </div>
    </SettingsFieldDepthContext.Provider>
  );
}
