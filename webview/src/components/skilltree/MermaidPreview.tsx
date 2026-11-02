import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

const initialDiagram = `flowchart TD
    A[Grundlagen] --> B[Variablen]
    B --> C[Schleifen]
    B --> D[Bedingungen]
    C --> E[Erstes Projekt]
    D --> E`;

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'strict',
  suppressErrorRendering: true, //suppress Mermaid errors
});

export default function MermaidPreview() {
  const [source, setSource] = useState(initialDiagram);
  const [confirmedSource, setConfirmedSource] = useState(initialDiagram);

  //Set error
  const [error, setError] = useState('');

  //Position and drag state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const dragStart = useRef({ x: 0, y: 0 });
  const positionStart = useRef({ x: 0, y: 0 });

  //Zoom
  const [zoom, setZoom] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);

  //Render Mermaid diagram
  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      try {
        const id = `mermaid-${crypto.randomUUID()}`;
        const { svg } = await mermaid.render(id, confirmedSource);

        if (cancelled || !containerRef.current) {
          return;
        }

        containerRef.current.innerHTML = svg;

        const svgElement = containerRef.current.querySelector('svg');

        if (svgElement) {
          svgElement.style.maxWidth = 'none';
          svgElement.style.width = 'auto';
          svgElement.style.height = 'auto';
          svgElement.style.display = 'block';
        }

        setError('');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    }

    void renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [confirmedSource]);

  //Transfer zoom and position to SVG
  useEffect(() => {
    const svgElement = containerRef.current?.querySelector('svg');

    if (svgElement) {
      svgElement.style.transform = `translate(${position.x}px, ${position.y}px) scale(${zoom})`;
      svgElement.style.transformOrigin = 'top left';
    }
  }, [zoom, position]);

  //Start dragging
  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    setIsDragging(true);

    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
    };

    positionStart.current = position;
  }

  //Move diagram
  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;

    const deltaX = event.clientX - dragStart.current.x;
    const deltaY = event.clientY - dragStart.current.y;

    setPosition({
      x: positionStart.current.x + deltaX,
      y: positionStart.current.y + deltaY,
    });
  }

  //Stop dragging
  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <main style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      <h1>Mermaid-Skilltree – Prototyp</h1>
      <p>Ändere den Quelltext, um das Diagramm neu zu rendern.</p>

      <label htmlFor="mermaid-source">Diagramm-Quelltext</label>

      <textarea
        id="mermaid-source"
        value={source}
        onChange={(event) => setSource(event.target.value)}
        rows={10}
        spellCheck={false}
        style={{
          display: 'block',
          width: '100%',
          marginTop: '8px',
          marginBottom: '16px',
          fontFamily: 'monospace',
        }}
      />

      {error && (
        <pre role="alert" style={{ color: 'red', whiteSpace: 'pre-wrap' }}>
          {error}
        </pre>
      )}

      {/* Button for saving changes on diagram */}
      <button
        onClick={() => setConfirmedSource(source)}
        disabled={source === confirmedSource}
        style={{
          padding: '8px 16px',
          marginBottom: '16px',
          border: '1px solid #888',
          borderRadius: '6px',
          cursor: 'pointer',
          backgroundColor: '#eee',
          color: '#222',
        }}
      >
        Diagramm übernehmen
      </button>

      {/* Zoom movement */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
        }}
      >
        <button
          onClick={() => setZoom((current) => Math.max(0.25, current - 0.25))}
          disabled={zoom <= 0.25}
        >
          −
        </button>

        <span>{Math.round(zoom * 100)} %</span>

        <button
          onClick={() => setZoom((current) => Math.min(3, current + 0.25))}
          disabled={zoom >= 3}
        >
          +
        </button>

        <button onClick={() => setZoom(1)}>Zoom zurücksetzen</button>
      </div>

      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          overflow: 'hidden',
          border: '1px solid #888',
          borderRadius: '8px',
          padding: '16px',
          minHeight: '500px',
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
          userSelect: 'none',
        }}
      />
    </main>
  );
}
