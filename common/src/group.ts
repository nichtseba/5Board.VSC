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
    isGroupElement(element) ? element.data.children : [element],
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

export function groupElementsInDocument(document: BoardDocument, ids: readonly string[]): boolean {
  const selectedIds = new Set(ids);

  if (selectedIds.size < 2) {
    return false;
  }

  const selected = document.content.elements.filter((element) => selectedIds.has(element.id));

  if (selected.length !== selectedIds.size || selected.some(isGroupElement)) {
    return false;
  }

  const children = selected.filter((element): element is EditorElement => !isGroupElement(element));

  const group: GroupElement = {
    id: crypto.randomUUID(),
    type: GROUP_ELEMENT_TYPE,
    data: {
      children,
    },
  };

  document.content.elements = [
    ...document.content.elements.filter((element) => !selectedIds.has(element.id)),
    group,
  ];

  document.content.selectedElementIds = children.map((child) => child.id);
  document.content.primarySelectedElementId = children[0]?.id ?? null;

  return true;
}

export function ungroupElementsInDocument(document: BoardDocument, groupId: string): boolean {
  const index = document.content.elements.findIndex(
    (element) => isGroupElement(element) && element.id === groupId,
  );

  if (index < 0) {
    return false;
  }

  const group = document.content.elements[index];
  if (!isGroupElement(group)) {
    return false;
  }

  document.content.elements.splice(index, 1, ...group.data.children);
  document.content.selectedElementIds = group.data.children.map((child) => child.id);
  document.content.primarySelectedElementId = group.data.children[0]?.id ?? null;

  return true;
}
