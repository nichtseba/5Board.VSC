export function getCommonValue<T>(values: T[]): T | undefined {
  if (values.length === 0) {
    return undefined;
  }

  const first = values[0];

  return values.every((value) => Object.is(value, first)) ? first : undefined;
}
