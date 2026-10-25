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
