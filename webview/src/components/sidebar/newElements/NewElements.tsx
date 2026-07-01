import { EditorElementType, EditorTool, EditorToolId } from '5board.vsc-common';
import { Button } from 'vscrui';
import SidebarSection from '../layout/SidebarSection';

export type newElementProps = {
  handleToolClick: (tool: EditorTool) => void;
};

export function NewElements({ handleToolClick }: newElementProps) {
  return (
    <>
      <SidebarSection title="Add Element">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-3">
          {Object.values(EditorElementType).map((type) => (
            <Button
              key={type}
              onClick={() =>
                handleToolClick({ type: EditorToolId.AddElement, parameters: { type } })
              }
              className="h-8 flex flex-col items-center justify-center gap-2"
            >
              <span>{type}</span>
            </Button>
          ))}
        </div>
      </SidebarSection>
    </>
  );
}
