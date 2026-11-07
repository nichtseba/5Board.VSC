import { type MermaidDirection } from './MermaidDirection';

type Props = {
  currentDirection?: MermaidDirection;
  onDirectionChange: (direction: MermaidDirection) => void;
};

//Setup directions for flowchart diagrams
const DIRECTIONS: { id: MermaidDirection; label: string }[] = [
  { id: 'TD', label: 'Oben nach unten' },
  { id: 'BT', label: 'Unten nach oben' },
  { id: 'LR', label: 'Links nach rechts' },
  { id: 'RL', label: 'Rechts nach links' },
];

export function MermaidToolbar({ currentDirection, onDirectionChange }: Props) {
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
