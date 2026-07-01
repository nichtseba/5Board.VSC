import { EditorTool } from '5board.vsc-common';
import SidebarSection from '../layout/SidebarSection';

export type newElementProps = {
  handleToolClick: (tool: EditorTool) => void;
};

export function NewCustomElements({ handleToolClick }: newElementProps) {
  return (
    <>
      <SidebarSection title="Add Custom Element">
        {/* Todo: replace this with actual valid content. This is just a placeholder */}
        {false && <div onClick={() => handleToolClick}></div>}
      </SidebarSection>
    </>
  );
}
