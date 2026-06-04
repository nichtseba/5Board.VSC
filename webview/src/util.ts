export type ArrayOrValue<T> = T | T[];

export function ensureArray<T>(value: ArrayOrValue<T> | null | undefined): T[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === null || value === undefined) {
    return [];
  }
  return [value];
}

export function getGridCellSize(container: HTMLElement | null): { width: number; height: number } {
  if (!container) {
    return { width: 1, height: 1 };
  }

  const style = getComputedStyle(container);
  const parsePx = (value: string) => Number(value.replace('px', '').trim()) || 0;

  const columns = parseInt(style.getPropertyValue('--editor-columns'), 10) || 1;
  const templateColumns = style.getPropertyValue('grid-template-columns');
  const columnWidth =
    parsePx(templateColumns.split(' ')[0]) || container.clientWidth / columns || 1;
  const rowHeight = parsePx(style.getPropertyValue('grid-auto-rows')) || columnWidth;

  return { width: columnWidth, height: rowHeight };
}
