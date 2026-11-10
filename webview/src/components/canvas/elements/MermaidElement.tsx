import { useEffect, useId, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { EditorElementType } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';

const getMermaidTheme = () => {
  const body = document.body;

  console.log('VS Code Theme Classes:', body.className);

  //Check if the user uses any dark or light mode (called default)
  if (body.classList.contains('vscode-dark') || body.classList.contains('vscode-high-contrast')) {
    return 'dark';
  }

  return 'default';
};

//Initialize Mermaid without automatically rendering elements in the document.
mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',
  theme: getMermaidTheme(),
});

/**
 * Renders a Mermaid diagram element.
 */
export function MermaidElement({
  element,
  registerZoomControls,
  isMermaidPanMode = false,
}: EditorElementProps<EditorElementType.Mermaid>) {
  const generatedId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const dragStart = useRef({ x: 0, y: 0 });
  const positionStart = useRef({ x: 0, y: 0 });

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if (!isMermaidPanMode) return;

    setIsDragging(true);

    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
    };

    positionStart.current = position;
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isMermaidPanMode || !isDragging) return;

    setPosition({
      x: positionStart.current.x + event.clientX - dragStart.current.x,
      y: positionStart.current.y + event.clientY - dragStart.current.y,
    });
  }

  function handlePointerUp() {
    setIsDragging(false);
  }

  //Available zoom levels: 25 % to 300 % in 25 % steps
  const zoomLevels = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3];

  function getNextZoom(currentZoom: number, direction: number) {
    if (direction > 0) {
      return zoomLevels.find((level) => level > currentZoom + 0.001) ?? 3;
    }

    return [...zoomLevels].reverse().find((level) => level < currentZoom - 0.001) ?? 0.25;
  }

  function applyZoom(newZoom: number, centerX: number, centerY: number) {
    const clampedZoom = Math.min(3, Math.max(0.25, newZoom));
    const scale = clampedZoom / zoom;

    setPosition({
      x: centerX - (centerX - position.x) * scale,
      y: centerY - (centerY - position.y) * scale,
    });

    setZoom(clampedZoom);
  }

  function handleZoomIn() {
    console.log('[MermaidElement] handleZoomIn aufgerufen');

    const container = containerRef.current;
    if (!container) {
      console.log('[MermaidElement] Kein Container gefunden');
      return;
    }

    applyZoom(
      getNextZoom(zoom, 1),
      container.clientWidth / 2 - 16,
      container.clientHeight / 2 - 16,
    );
  }

  function handleZoomOut() {
    const container = containerRef.current;
    if (!container) return;

    applyZoom(
      getNextZoom(zoom, -1),
      container.clientWidth / 2 - 16,
      container.clientHeight / 2 - 16,
    );
  }

  function handleZoomReset() {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }

  function handlePositionReset() {
    setPosition({ x: 0, y: 0 });
  }

  useEffect(() => {
    let cancelled = false;

    const renderDiagram = async () => {
      try {
        const id = `mermaid-${generatedId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
        const result = await mermaid.render(id, element.data.source);
        console.log('[Mermaid Debug] SVG:', result.svg);

        const noteGroups = [...result.svg.matchAll(/<g\b[^>]*id="[^"]*-note\d+"[^>]*>/g)];

        console.table(
          noteGroups.map((match, index) => ({
            order: index,
            svgId: match[0].match(/id="([^"]+)"/)?.[1],
            position: match.index,
          })),
        );

        if (cancelled) return;

        const parsed = new DOMParser().parseFromString(result.svg, 'text/html');
        const svgElement = parsed.querySelector('svg');

        const note0 = svgElement?.querySelector('[id$="-note0"]');
        const note1 = svgElement?.querySelector('[id$="-note1"]');

        if (note0 && note1 && note0.parentElement === note1.parentElement) {
          note1.after(note0);
        }

        setSvg(svgElement?.outerHTML ?? result.svg);
        setError(null);
      } catch (err) {
        if (cancelled) return;

        setError(err instanceof Error ? err.message : String(err));
      }
    };

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [element.data.source, generatedId]);

  //Apply zoom and position to SVG
  useEffect(() => {
    const svgElement = containerRef.current?.querySelector<SVGSVGElement>('svg');

    if (!svgElement) return;

    const translateX = position.x;
    const translateY = position.y;

    svgElement.style.transform = `translate(${translateX}px, ${translateY}px) scale(${zoom})`;

    svgElement.style.transformOrigin = 'top left';
  }, [svg, zoom, position, isMermaidPanMode]);

  //Register SVG zoom controls
  useEffect(() => {
    registerZoomControls?.({
      zoomIn: handleZoomIn,
      zoomOut: handleZoomOut,
      resetZoom: handleZoomReset,
      resetPosition: handlePositionReset,
      zoomPercent: Math.round(zoom * 100),
      canZoomIn: zoom < 3,
      canZoomOut: zoom > 0.25,
    });

    return () => registerZoomControls?.(null);
  }, [registerZoomControls, zoom, position]);

  const { backgroundColor, border } = element.style;
  const cssBorderStyle =
    border?.style === 'dashed' || border?.style === 'dotted' ? border.style : 'solid';

  return (
    <>
      <style>
        {`
          .mermaid-container {
            overflow: hidden;
            justify-content: flex-start;
            align-items: flex-start;
          }

          .mermaid-container svg {
            width: auto;
            height: auto;
            max-width: none;
            max-height: none;
            display: block;
            flex-shrink: 0;
          }

          .mermaid-container .noteLabel foreignObject {
            overflow: visible;
          }

          .mermaid-container .noteLabel foreignObject div {
            white-space: normal !important;
            overflow-wrap: anywhere;
            word-break: normal;
          }
        `}
      </style>
      <div
        style={{
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          backgroundColor,
          opacity: element.style.opacity ?? 1,
          border: border?.color
            ? `${border.width ?? 1}px ${cssBorderStyle} ${border.color}`
            : undefined,
          borderRadius: border?.radius,
          overflow: 'hidden',
        }}
        className="flex items-center justify-center"
      >
        {error ? (
          <div className="p-2 text-sm text-red-500">Mermaid rendering error: {error}</div>
        ) : svg ? (
          <div
            ref={containerRef}
            className="mermaid-container flex h-full w-full items-center"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{
              cursor: isDragging ? 'grabbing' : 'grab',
              touchAction: 'none',
            }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="text-sm opacity-60">Rendering diagram...</div>
        )}
      </div>
    </>
  );
}
