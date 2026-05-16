export * from './Element';
export * from './boardFormat';

export type AppState = {
  counter: number;
  selectedElementId: string | null;
};

// Messages FROM the extension TO webviews
export type ExtensionToWebviewMessage =
  | { type: 'init'; state: AppState }
  | { type: 'updateContent'; state: AppState }
  | { type: 'fileLoaded'; content: string; fileName: string }
  | { type: 'statusUpdate'; status: string }
  | { type: 'error'; message: string };

// Messages FROM webviews TO the extension
export type WebviewToExtensionMessage =
  | { type: 'ready' }
  | { type: 'runCode'; code: string }
  | { type: 'counterIncrement' }
  | { type: 'counterDecrement' }
  | { type: 'selectElement'; id: string | null };
