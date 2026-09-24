import { createContext, useContext } from 'react';

/**
 * Provides the computed hierarchical heading numbers (keyed by element id) to
 * heading elements rendered within the canvas. The map is computed once in
 * {@link EditorCanvas} so both the editor and the HTML export share it.
 */
const HeadingNumberingContext = createContext<Map<string, string>>(new Map());

export function HeadingNumberingProvider({
  value,
  children,
}: {
  value: Map<string, string>;
  children: React.ReactNode;
}) {
  return (
    <HeadingNumberingContext.Provider value={value}>{children}</HeadingNumberingContext.Provider>
  );
}

/** Returns the computed number string for a heading element, or undefined if none. */
export function useHeadingNumber(id: string): string | undefined {
  return useContext(HeadingNumberingContext).get(id);
}
