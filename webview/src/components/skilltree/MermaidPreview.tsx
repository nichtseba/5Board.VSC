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
});

export default function MermaidPreview() {
  const [source, setSource] = useState(initialDiagram);
  const [error, setError] = useState('');

  //Zoom
  const [zoom, setZoom] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      try {
        const id = `mermaid-${crypto.randomUUID()}`;
        const { svg } = await mermaid.render(id, source);

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
          svgElement.style.transformOrigin = 'top left';
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
  }, [source]);

  //Transfer zoom to SVG
  useEffect(() => {
    const svgElement = containerRef.current?.querySelector('svg');

    if (svgElement) {
      svgElement.style.transform = `scale(${zoom})`;
      svgElement.style.transformOrigin = 'top left';
    }
  }, [zoom]);

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
        style={{
          overflow: 'auto',
          border: '1px solid #888',
          borderRadius: '8px',
          padding: '16px',
        }}
      />
    </main>
  );
}
