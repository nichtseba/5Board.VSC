import React from 'react';

const ViewTypeContext = React.createContext<'editor' | 'projector' | 'export' | null>(null);

export const ViewTypeProvider = ViewTypeContext.Provider;
export function useViewType() {
  const viewType = React.useContext(ViewTypeContext);
  if (!viewType) {
    throw new Error('useViewType must be used within a ViewTypeProvider');
  }
  return viewType;
}

export function useIsProjectorView() {
  const viewType = useViewType();
  return viewType === 'projector';
}

export function useIsEditorView() {
  const viewType = useViewType();
  return viewType === 'editor';
}

export function useIsExportView() {
  const viewType = useViewType();
  return viewType === 'export';
}
