import React, { createContext, useContext, useRef, useState, useCallback } from 'react';

export type GridSize = {
  width: number;
  height: number;
};
export type GridContextValue = {
  cellSize: GridSize;
  setGridElement: (el: HTMLElement | null) => void;
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

export default function GridProvider({ children }: Props) {
  const [cellSize, setCellSize] = useState<GridSize>({
    width: 1,
    height: 1,
  });

  const observerRef = useRef<ResizeObserver | null>(null);

  const setGridElement = useCallback((el: HTMLElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (!el) return;

    const update = () => {
      setCellSize(getGridCellSize(el));
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);

    observerRef.current = observer;
  }, []);

  return (
    <GridContext.Provider value={{ cellSize, setGridElement }}>{children}</GridContext.Provider>
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
