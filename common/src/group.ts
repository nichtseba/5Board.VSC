import {
  BoardDocument,
  BoardElement,
  EditorElement,
  GROUP_ELEMENT_TYPE,
  GroupElement,
} from './main';

export function isGroupElement(element: BoardElement): element is GroupElement {
  return element.type === GROUP_ELEMENT_TYPE;
}

export function flattenBoardElements(elements: readonly BoardElement[]): EditorElement[] {
  return elements.flatMap((element) =>
    isGroupElement(element) ? flattenBoardElements(element.data.children) : [element],
  );
}

export function getLeafElementIds(elements: readonly BoardElement[]): string[] {
  return elements.flatMap((element) =>
    isGroupElement(element) ? getLeafElementIds(element.data.children) : [element.id],
  );
}

export function findBoardElementById(
  elements: readonly BoardElement[],
  id: string,
): BoardElement | undefined {
  for (const element of elements) {
    if (element.id === id) {
      return element;
    }

    if (isGroupElement(element)) {
      const child = findBoardElementById(element.data.children, id);
      if (child) {
        return child;
      }
    }
  }

  return undefined;
}

export function groupElementsInDocument(document: BoardDocument, ids: readonly string[]): void {
  const children = document.content.elements.filter((element) => ids.includes(element.id));

  const group: GroupElement = {
    id: crypto.randomUUID(),
    type: GROUP_ELEMENT_TYPE,
    data: {
      children,
    },
  };

  document.content.elements = [
    ...document.content.elements.filter((element) => !ids.includes(element.id)),
    group,
  ];

  document.content.selectedElementIds = [group.id];
  document.content.primarySelectedElementId = group.id;
}

export function ungroupElementsInDocument(document: BoardDocument, groupId: string): void {
  const index = document.content.elements.findIndex((element) => element.id === groupId);
  const group = document.content.elements[index];
  if (!isGroupElement(group)) {
    return;
  }

  const children = group.data?.children;

  document.content.elements.splice(index, 1, ...children);

  document.content.selectedElementIds = children.map((child) => child.id);
  document.content.primarySelectedElementId = children[0]?.id ?? null;
}
