export type ArrayOrValue<T> = T | T[];

export function ensureArray<T>(value: ArrayOrValue<T> | null | undefined): T[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (value == null || value === undefined) {
    return [];
  }
  return [value];
}
