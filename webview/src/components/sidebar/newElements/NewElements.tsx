import { ELEMENT_TYPE_DEFINITIONS, EditorTool, EditorToolId } from '5board.vsc-common';
import { Button } from 'vscrui';
import SidebarSection from '../layout/SidebarSection';
import { useLocalization } from '../../../providers/LocalizationProvider';

export type newElementProps = {
  handleToolClick: (tool: EditorTool) => void;
};

export function NewElements({ handleToolClick }: newElementProps) {
  const { t } = useLocalization();

  const addableElements = Object.entries(ELEMENT_TYPE_DEFINITIONS).filter(
    ([, definition]) => definition.category === 'basic',
  );

  return (
    <>
      <SidebarSection title={t('webview.sidebar.addElement')}>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-3">
          {addableElements.map(([type, definition]) => {
            return (
              <Button
                key={type}
                onClick={() =>
                  handleToolClick({
                    type: EditorToolId.AddElement,
                    parameters: {
                      type,
                      placementMode: definition.placement,
                    },
                  })
                }
                className="h-8 flex flex-col items-center justify-center gap-2"
                title={definition.label}
              >
                <span className="text-xs text-center">{definition.label}</span>
              </Button>
            );
          })}
        </div>
      </SidebarSection>
    </>
  );
}
