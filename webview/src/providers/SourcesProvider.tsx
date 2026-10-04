import { createContext, useContext } from 'react';
import type { Source } from '5board.vsc-common';

const SourcesContext = createContext<Source[]>([]);

export const SourcesProvider = SourcesContext.Provider;

export function useSources(): Source[] {
  return useContext(SourcesContext);
}
