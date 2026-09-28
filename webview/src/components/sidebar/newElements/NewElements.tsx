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
import { useBoardDocument } from '../../../providers/BoardDocumentProvider';

export type newElementProps = {
  handleToolClick: (tool: EditorTool) => void;
};

export function NewElements({ handleToolClick }: newElementProps) {
  const { t } = useLocalization();
  const editorState = useEditorState();
  const messages = useMessageService();
  const boardDocument = useBoardDocument();

  const [selectedElement, setSelectedElement] = useState<EditorElementType | undefined>();
  const [hoveredElementLabel, setHoveredElementLabel] = useState<string>();
  const [showTocNotice, setShowTocNotice] = useState(false);

  const existingToc = boardDocument?.content.elements.find(
    (element) => element.type === EditorElementType.TableOfContents,
  );

  useEffect(() => {
    if (editorState?.tool.type !== EditorToolId.AddElement) {
      setSelectedElement(undefined);
    }
  }, [editorState?.tool.type]);

  useEffect(() => {
    if (!showTocNotice) return;

    const timer = window.setTimeout(() => setShowTocNotice(false), 2000);
    return () => window.clearTimeout(timer);
  }, [showTocNotice]);

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

    if (elementType === EditorElementType.TableOfContents && existingToc) {
      setShowTocNotice(true);
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
    <SidebarSection
      title={`${t('webview.sidebar.addElement')}${hoveredElementLabel ? `: ${hoveredElementLabel}` : ''}`}
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(2rem,1fr))] gap-2">
        {addableElements
          .filter(([key]) => key !== EditorToolId.FREEHAND)
          .map(([type, definition]) => {
            const elementType = type as EditorElementType;
            const isSelected = selectedElement === elementType;

            return (
              <Button
                key={type}
                title={t(definition.label)}
                onMouseEnter={() => setHoveredElementLabel(t(definition.label))}
                onMouseLeave={() => setHoveredElementLabel(undefined)}
                onClick={() => handleElementClick(elementType, definition.placement)}
                appearance={isSelected ? 'primary' : 'secondary'}
                className="relative h-8 w-8 flex items-center justify-center"
              >
                <span className={`codicon codicon-${definition.icon}`} />
                {elementType === EditorElementType.TableOfContents && existingToc && (
                  <span className="pointer-events-none absolute -inset-x-0.5 top-1/2 h-0.5 -rotate-45 bg-current" />
                )}
              </Button>
            );
          })}
      </div>
      {showTocNotice && (
        <div className="mt-2 rounded border p-2 text-sm">
          {t('webview.sidebar.tableOfContentsAlreadyExists')}
        </div>
      )}
    </SidebarSection>
  );
}
