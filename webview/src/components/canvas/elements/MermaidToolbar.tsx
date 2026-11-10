import { type MermaidDirection } from './MermaidDirection';

type Props = {
  currentDirection?: MermaidDirection;
  onDirectionChange: (direction: MermaidDirection) => void;
  zoomPercent?: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onPositionReset: () => void;
  canZoomIn?: boolean;
  canZoomOut?: boolean;
  isPanMode: boolean;
  onPanModeChange: (enabled: boolean) => void;
};

// Setup directions for flowchart diagrams
const DIRECTIONS: { id: MermaidDirection; label: string }[] = [
  { id: 'TD', label: 'Oben nach unten' },
  { id: 'BT', label: 'Unten nach oben' },
  { id: 'LR', label: 'Links nach rechts' },
  { id: 'RL', label: 'Rechts nach links' },
];

const buttonStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 4,
  border: '1px solid var(--vscode-widget-border)',
  backgroundColor: 'var(--vscode-editorWidget-background)',
  color: 'var(--vscode-foreground)',
  cursor: 'pointer',
};

export function MermaidToolbar({
  currentDirection,
  onDirectionChange,
  zoomPercent = 100,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onPositionReset,
  canZoomIn = true,
  canZoomOut = true,
  isPanMode,
  onPanModeChange,
}: Props) {
  return (
    <div role="toolbar" aria-label="Mermaid-Werkzeuge" className="flex items-center gap-1">
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
              ...buttonStyle,
              backgroundColor: active
                ? 'var(--vscode-button-background)'
                : 'var(--vscode-editorWidget-background)',
              color: active ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
            }}
          >
            {label} ({id})
          </button>
        );
      })}

      <button
        type="button"
        title="Diagramm verschieben"
        aria-pressed={isPanMode}
        onClick={() => onPanModeChange(!isPanMode)}
        style={{
          ...buttonStyle,
          backgroundColor: isPanMode
            ? 'var(--vscode-button-background)'
            : 'var(--vscode-editorWidget-background)',
          color: isPanMode ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
        }}
      >
        {isPanMode ? 'Pan: AN' : 'Pan: AUS'}
      </button>

      <button
        type="button"
        title="Verkleinern"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        style={buttonStyle}
      >
        −
      </button>

      <span style={{ minWidth: 48, textAlign: 'center' }}>{zoomPercent} %</span>

      <button
        type="button"
        title="Vergrößern"
        onClick={() => {
          console.log('[MermaidToolbar] Zoom-In geklickt');
          onZoomIn();
        }}
        disabled={!canZoomIn}
        style={buttonStyle}
      >
        +
      </button>

      <button
        type="button"
        title="Zoom und Position zurücksetzen"
        onClick={onZoomReset}
        style={buttonStyle}
      >
        Zoom zurücksetzen
      </button>

      <button
        type="button"
        title="Nur Position zurücksetzen"
        onClick={onPositionReset}
        style={buttonStyle}
      >
        Position zurücksetzen
      </button>
    </div>
  );
}
