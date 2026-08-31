import { ELEMENT_TYPE_DEFINITIONS, EditorTool, EditorToolId } from '5board.vsc-common';
import SidebarSection from '../layout/SidebarSection';
import { useLocalization } from '../../../providers/LocalizationProvider';

export type newElementProps = {
  handleToolClick: (tool: EditorTool) => void;
};

export function NewCustomElements({ handleToolClick }: newElementProps) {
  const { t } = useLocalization();
  const specialElements = Object.entries(ELEMENT_TYPE_DEFINITIONS).filter(
    ([, definition]) => definition.category === 'special',
  );

  return (
    <>
      <SidebarSection title={t('webview.sidebar.addCustomElement')}>
        {specialElements.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-3 opacity-70">
            {specialElements.map(([type, definition]) => (
              <button
                key={type}
                type="button"
                disabled
                onClick={() =>
                  handleToolClick({
                    type: EditorToolId.AddElement,
                    parameters: {
                      type,
                      placementMode: definition.placement,
                      custom: true,
                    },
                  })
                }
                className="h-8 rounded-md border border-dashed border-slate-500 bg-slate-500/5 px-2 text-xs text-slate-400"
              >
                {definition.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">Coming soon</p>
        )}
      </SidebarSection>
    </>
  );
}
