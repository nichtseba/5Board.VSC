import { EditorElement, EditorElementType, getHeadingLevelSettings } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';
import { useBoardDocument } from '../../../providers/BoardDocumentProvider';
import { useMessageService } from '../../../services/MessageService';
import { useHeadingNumber } from '../HeadingNumberingContext';
import type React from 'react';

const DEFAULT_CONTENT_TABLE_FONT_SIZE = 14;

//builds CSS style for one toc entry, based on the corresponding heading
function getContentTableEntryStyle(
  heading: EditorElement<EditorElementType.Heading>,
  boardDocument: ReturnType<typeof useBoardDocument>,
): React.CSSProperties {
  const levelSettings = getHeadingLevelSettings(
    boardDocument?.content.headingSettings,
    heading.data.level,
  );

  return {
    color: levelSettings.color,
    fontFamily: levelSettings.fontFamily,
    fontWeight: levelSettings.fontWeight,
    fontStyle: levelSettings.fontStyle,
    fontSize: 'inherit',
  };
}

export function ContentTableElement({
  element,
}: EditorElementProps<EditorElementType.ContentTable>) {
  const boardDocument = useBoardDocument();
  const messages = useMessageService();

  function goToHeading(id: string) {
    const target = document.getElementById(id);

    if (!target) {
      return;
    }

    target.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    });

    messages.send({
      type: 'selectElement',
      id,
    });
  }

  const headings =
    boardDocument?.content.elements
      .filter(isHeadingElement)
      .slice()
      .sort((a, b) => a.layout.yPos - b.layout.yPos || a.layout.xPos - b.layout.xPos) ?? [];

  return (
    <div
      className="flex flex-col gap-1 font-normal"
      style={{ fontSize: `${element.data.fontSize ?? DEFAULT_CONTENT_TABLE_FONT_SIZE}px` }}
    >
      {headings.map((heading) => (
        <ContentTableEntry
          key={heading.id}
          heading={heading}
          boardDocument={boardDocument}
          onClick={goToHeading}
        />
      ))}
    </div>
  );
}

//renders a single clickable toc entry with numbering, indentation and visual styling
function ContentTableEntry({
  heading,
  boardDocument,
  onClick,
}: {
  heading: EditorElement<EditorElementType.Heading>;
  boardDocument: ReturnType<typeof useBoardDocument>;
  onClick: (id: string) => void;
}) {
  const number = useHeadingNumber(heading.id);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick(heading.id);
      }}
      className="w-fit text-left hover:underline"
      style={{
        ...getContentTableEntryStyle(heading, boardDocument),
        marginLeft: `${(heading.data.level - 1) * 20}px`,
      }}
    >
      {number ? `${number} ` : ''}
      {heading.data.content}
    </button>
  );
}

function isHeadingElement(
  element: EditorElement,
): element is EditorElement<EditorElementType.Heading> {
  return element.type === EditorElementType.Heading;
}
