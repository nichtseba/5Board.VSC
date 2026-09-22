import React, { createContext, useContext, useRef, useState, useCallback } from 'react';

/**
 * Provides the current grid cell dimensions to all editor components.
 * Cell sizes are derived from the rendered grid and updated automatically
 * whenever the grid container is resized.
 */

export type GridSize = {
  width: number;
  height: number;
};
export type GridContextValue = {
  cellSize: GridSize;
  metrics: GridMetrics;
  setGridElement: (el: HTMLElement | null) => void;
};
export type GridMetrics = {
  top: number;
  left: number;
  width: number;
  height: number;
};

// Context
export const GridContext = createContext<GridContextValue | null>(null);

function getGridCellSize(container: HTMLElement | null): GridSize {
  if (!container) {
    return { width: 1, height: 1 };
  }

  const style = getComputedStyle(container);
  const parsePx = (value: string) => Number(value.replace('px', '').trim()) || 0;

  const columns = parseInt(style.getPropertyValue('--editor-columns'), 10) || 1;
  const columnWidth = container.clientWidth / columns || 1;
  const rowHeight = parsePx(style.getPropertyValue('grid-auto-rows')) || columnWidth;

  return {
    width: columnWidth,
    height: rowHeight,
  };
}

type Props = {
  children: React.ReactNode;
};

export function GridProvider({ children }: Props) {
  const [cellSize, setCellSize] = useState<GridSize>({
    width: 1,
    height: 1,
  });
  const [metrics, setMetrics] = useState<GridMetrics>({ top: 0, left: 0, width: 0, height: 0 });

  const observerRef = useRef<ResizeObserver | null>(null);

  const setGridElement = useCallback((el: HTMLElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (!el) return;

    const update = () => {
      const next = getGridCellSize(el);

      setCellSize((prev) =>
        prev.width === next.width && prev.height === next.height ? prev : next,
      );

      const rect = el.getBoundingClientRect();

      setMetrics({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);

    observerRef.current = observer;
  }, []);

  return (
    <GridContext.Provider value={{ cellSize, metrics, setGridElement }}>
      {children}
    </GridContext.Provider>
  );
}

// Hook
export function useGrid() {
  const ctx = useContext(GridContext);
  if (!ctx) {
    throw new Error('useGrid must be used inside GridProvider');
  }
  return ctx;
}
