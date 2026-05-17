import { LocalizationContextType } from '5board.vsc-common';
import { createContext, useContext } from 'react';

export const LocalizationContext = createContext<LocalizationContextType>({
  language: 'en',
});

export function useLocalization() {
  return useContext(LocalizationContext);
}
