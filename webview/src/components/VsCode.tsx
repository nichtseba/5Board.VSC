import { createContext, useContext } from 'react';
import { WebviewApi } from 'vscode-webview';

type StateType = unknown;

// acquireVsCodeApi() may only be called ONCE — exported so MessageService can reuse it
export const vscodeApi = acquireVsCodeApi<StateType>();

export const VsCodeContext = createContext<WebviewApi<StateType>>(vscodeApi);

export function useVsCode(): WebviewApi<StateType> {
  return useContext(VsCodeContext);
}
