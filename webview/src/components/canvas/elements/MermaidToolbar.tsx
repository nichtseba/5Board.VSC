type MermaidDirection = 'TD' | 'BT' | 'LR' | 'RL';

type Props = {
  source: string;
  onDirectionChange: (direction: MermaidDirection) => void;
};

const DIRECTIONS: { id: MermaidDirection; label: string }[] = [
  { id: 'TD', label: 'Oben nach unten' },
  { id: 'BT', label: 'Unten nach oben' },
  { id: 'LR', label: 'Links nach rechts' },
  { id: 'RL', label: 'Rechts nach links' },
];

export function MermaidToolbar({ source, onDirectionChange }: Props) {
  const match = source.match(/^\s*(?:flowchart|graph)\s+(TD|BT|LR|RL)\b/im);
  const currentDirection = match?.[1] as MermaidDirection | undefined;

  return (
    <div role="toolbar" aria-label="Mermaid-Ausrichtung" className="flex items-center gap-1">
      {DIRECTIONS.map(({ id, label }) => {
        const active = currentDirection === id;

        return (
          <button
            key={id}
            type="button"
            title={`${label} (${id})`}
            aria-pressed={active}
            onClick={() => onDirectionChange(id)}
            style={{
              padding: '6px 10px',
              borderRadius: 4,
              border: '1px solid var(--vscode-widget-border)',
              backgroundColor: active
                ? 'var(--vscode-button-background)'
                : 'var(--vscode-editorWidget-background)',
              color: active ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
              cursor: 'pointer',
            }}
          >
            {label} ({id})
          </button>
        );
      })}
    </div>
  );
}
