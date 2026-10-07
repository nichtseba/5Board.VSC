import {
  BoardDocument,
  BoardElement,
  EditorElement,
  GROUP_ELEMENT_TYPE,
  GroupElement,
  normalizeElementRevealOrder,
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

export function findTopLevelBoardElement(
  elements: readonly BoardElement[],
  id: string,
): BoardElement | undefined {
  return elements.find(
    (element) =>
      element.id === id ||
      (isGroupElement(element) && findBoardElementById(element.data.children, id) !== undefined),
  );
}

export function groupElementsInDocument(document: BoardDocument, ids: readonly string[]): boolean {
  const selectedIds = new Set(ids);
  const children = document.content.elements.filter((element) => selectedIds.has(element.id));

  if (selectedIds.size < 2 || children.length !== selectedIds.size) {
    return false;
  }

  const group: GroupElement = {
    id: crypto.randomUUID(),
    type: GROUP_ELEMENT_TYPE,
    data: {
      children,
    },
  };

  // Keep the group where its first child was in the reveal order instead of appending it.
  const firstChildIndex = document.content.elements.findIndex((element) =>
    selectedIds.has(element.id),
  );
  const remaining = document.content.elements.filter((element) => !selectedIds.has(element.id));
  remaining.splice(firstChildIndex, 0, group);
  document.content.elements = normalizeElementRevealOrder(remaining);

  document.content.selectedElementIds = [group.id];
  document.content.primarySelectedElementId = group.id;
  return true;
}

export function ungroupElementsInDocument(document: BoardDocument, groupId: string): boolean {
  const index = document.content.elements.findIndex((element) => element.id === groupId);
  const group = document.content.elements[index];
  if (!isGroupElement(group)) {
    return false;
  }

  const children = group.data?.children;

  document.content.elements.splice(index, 1, ...children);

  document.content.selectedElementIds = children.map((child) => child.id);
  document.content.primarySelectedElementId = children[0]?.id ?? null;
  return true;
}
