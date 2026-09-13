import {
  ELEMENT_TYPE_DEFINITIONS,
  EditorElementType,
  EditorTool,
  EditorToolId,
} from '5board.vsc-common';
import { Button } from 'vscrui';
import SidebarSection from '../layout/SidebarSection';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { useEditorState } from '../../../providers/EditorStateProvider';
import { useMessageService } from '../../../services/MessageService';
import { useEffect, useState } from 'react';

export type newElementProps = {
  handleToolClick: (tool: EditorTool) => void;
};

export function NewElements({ handleToolClick }: newElementProps) {
  const { t } = useLocalization();
  const editorState = useEditorState();
  const messages = useMessageService();

  const [selectedElement, setSelectedElement] = useState<EditorElementType | undefined>();

  useEffect(() => {
    if (editorState?.tool.type !== EditorToolId.AddElement) {
      setSelectedElement(undefined);
    }
  }, [editorState?.tool.type]);

  const addableElements = Object.entries(ELEMENT_TYPE_DEFINITIONS).filter(
    ([, definition]) => definition.category === 'basic',
  );

  const handleElementClick = (
    elementType: EditorElementType,
    placementMode: (typeof ELEMENT_TYPE_DEFINITIONS)[EditorElementType]['placement'],
  ) => {
    if (elementType === EditorElementType.Image) {
      messages.send({ type: 'addImageFromFile' });
      return;
    }

    setSelectedElement(elementType);
    handleToolClick({
      type: EditorToolId.AddElement,
      parameters: {
        type: elementType,
        placementMode,
      },
    });
  };

  return (
    <SidebarSection title={t('webview.sidebar.addElement')}>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-3">
        {addableElements
          .filter(([key]) => key !== EditorToolId.FREEHAND)
          .map(([type, definition]) => {
            const elementType = type as EditorElementType;
            const isSelected = selectedElement === elementType;

            return (
              <Button
                key={type}
                onClick={() => handleElementClick(elementType, definition.placement)}
                appearance={isSelected ? 'primary' : 'secondary'}
                className="h-8 flex flex-col items-center justify-center gap-2"
              >
                <span>{definition.label}</span>
              </Button>
            );
          })}
      </div>
    </SidebarSection>
  );
}
