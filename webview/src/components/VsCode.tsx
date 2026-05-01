import { createContext, useContext } from 'react';
import { WebviewApi } from 'vscode-webview';

type StateType = unknown;

export const VsCodeContext = createContext(acquireVsCodeApi<StateType>());

export function useVsCode(): WebviewApi<StateType> {
  return useContext(VsCodeContext);
}
