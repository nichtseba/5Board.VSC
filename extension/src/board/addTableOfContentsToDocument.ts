import { BoardDocument, EditorElementType } from '5board.vsc-common';

export function addTableOfContentsToDocument(document: BoardDocument): void {
  const existingContentTable = document.content.elements.find(
    (element) => element.type === EditorElementType.ContentTable,
  );

  if (existingContentTable) {
    document.content.selectedElementId = existingContentTable.id;
    return;
  }

  const headingCount = document.content.elements.filter(
    (element) => element.type === EditorElementType.Heading,
  ).length;

  const height = Math.max(6, 2 + headingCount * 2);

  document.content.elements.push({
    id: `toc-${Date.now()}`,
    type: EditorElementType.ContentTable,
    layout: {
      xPos: 0,
      yPos: 0,
      width: 60,
      height,
    },
    style: {
      visible: true,
    },
    data: {
      title: 'Inhaltsverzeichnis',
    },
  });
}
