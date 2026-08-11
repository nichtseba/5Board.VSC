import { EditorElement, EditorElementType } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';
import { useBoardDocument } from '../../../providers/BoardDocumentProvider';
import { useMessageService } from '../../../services/MessageService';

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
    <div className="flex flex-col gap-1 text-sm font-normal">
      <div className="font-semibold">{element.data.title}</div>
      {headings.map((heading) => (
        <button
          key={heading.id}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            goToHeading(heading.id);
          }}
          className="w-fit text-left hover:underline"
          style={{
            marginLeft: `${(heading.data.level - 1) * 12}px`,
          }}
        >
          {heading.data.content}
        </button>
      ))}
    </div>
  );
}

function isHeadingElement(
  element: EditorElement,
): element is EditorElement<EditorElementType.Heading> {
  return element.type === EditorElementType.Heading;
}
