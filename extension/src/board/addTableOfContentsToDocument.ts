import { BoardDocument, BoardElement, EditorElement, EditorElementType } from '5board.vsc-common';

export function addTableOfContentsToDocument(document: BoardDocument): void {
  const content = createTableOfContentsText(document.content.elements);

  document.content.elements.push({
    id: `toc-${Date.now()}`,
    type: EditorElementType.Text,
    layout: {
      xPos: 0,
      yPos: 0,
      width: 60,
      height: Math.max(6, content.split('\n').length * 2),
    },
    style: {
      visible: true,
    },
    data: {
      content,
    },
  });
}

export function createTableOfContentsText(elements: BoardElement[]): string {
  const headings = elements
    .filter(isHeadingElement)
    .slice()
    .sort((a, b) => a.layout.yPos - b.layout.yPos);

  return headings
    .map((heading) => {
      const indent = '  '.repeat(heading.data.level - 1);
      return `${indent}${heading.data.content}`;
    })
    .join('\n');
}

function isHeadingElement(
  element: BoardElement,
): element is EditorElement<EditorElementType.Heading> {
  return element.type === EditorElementType.Heading;
}
