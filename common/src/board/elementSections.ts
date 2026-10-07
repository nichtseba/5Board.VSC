import {
  BoardElement,
  EditorElement,
  EditorElementType,
  getElementLayout,
  GROUP_ELEMENT_TYPE,
} from './element';

export type ElementSectionMap = Map<string, string | null>;

export function getElementSectionMap(elements: readonly BoardElement[]): ElementSectionMap {
  const sectionById: ElementSectionMap = new Map();
  const headingStack: EditorElement<EditorElementType.Heading>[] = [];
  const positionedElements = elements
    .map((element, index) => ({ element, index }))
    .sort(
      (a, b) =>
        getElementLayout(a.element).yPos - getElementLayout(b.element).yPos ||
        getElementLayout(a.element).xPos - getElementLayout(b.element).xPos ||
        a.index - b.index,
    );

  for (const { element } of positionedElements) {
    if (isHeading(element)) {
      while (
        headingStack.length > 0 &&
        headingStack[headingStack.length - 1].data.level >= element.data.level
      ) {
        headingStack.pop();
      }
      sectionById.set(element.id, headingStack[headingStack.length - 1]?.id ?? null);
      headingStack.push(element);
    } else {
      sectionById.set(element.id, headingStack[headingStack.length - 1]?.id ?? null);
    }
  }

  return sectionById;
}

export function normalizeElementRevealOrder(elements: readonly BoardElement[]): BoardElement[] {
  const sectionById = getElementSectionMap(elements);
  const remainingParents = new Map<string, string>();
  const childrenByParent = new Map<string, string[]>();
  const elementById = new Map(elements.map((element) => [element.id, element]));
  const originalIndex = new Map(elements.map((element, index) => [element.id, index]));

  for (const [id, parentId] of sectionById) {
    if (parentId && elementById.has(parentId)) {
      remainingParents.set(id, parentId);
      const children = childrenByParent.get(parentId) ?? [];
      children.push(id);
      childrenByParent.set(parentId, children);
    }
  }

  const ready = elements.filter((element) => !remainingParents.has(element.id));
  const ordered: BoardElement[] = [];

  while (ready.length > 0) {
    ready.sort((a, b) => originalIndex.get(a.id)! - originalIndex.get(b.id)!);
    const element = ready.shift()!;
    ordered.push(element);

    for (const childId of childrenByParent.get(element.id) ?? []) {
      remainingParents.delete(childId);
      const child = elementById.get(childId);
      if (child) {
        ready.push(child);
      }
    }
  }

  return ordered.length === elements.length ? ordered : [...elements];
}

export function reconcileElementRevealOrder(
  elements: readonly BoardElement[],
  previousSections: ReadonlyMap<string, string | null>,
): BoardElement[] {
  const nextSections = getElementSectionMap(elements);
  const originalOrder = new Map(elements.map((element, index) => [element.id, index]));
  const movedElements = elements
    .filter((element) => previousSections.get(element.id) !== nextSections.get(element.id))
    .sort(
      (a, b) =>
        getElementLayout(a).yPos - getElementLayout(b).yPos ||
        getElementLayout(a).xPos - getElementLayout(b).xPos ||
        originalOrder.get(a.id)! - originalOrder.get(b.id)!,
    );
  const reordered = [...elements];
  // Moved elements that have not been placed yet still sit at their old index (new elements at
  // the end), so they must not serve as anchors for the others.
  const pendingIds = new Set(movedElements.map((element) => element.id));

  for (const element of movedElements) {
    pendingIds.delete(element.id);
    const currentIndex = reordered.findIndex((candidate) => candidate.id === element.id);
    if (currentIndex < 0) {
      continue;
    }
    reordered.splice(currentIndex, 1);

    const targetSectionId = nextSections.get(element.id) ?? null;
    const targetSiblings = reordered.filter(
      (candidate) =>
        !pendingIds.has(candidate.id) && nextSections.get(candidate.id) === targetSectionId,
    );
    const nextSibling = targetSiblings.find(
      (candidate) =>
        getElementLayout(candidate).yPos > getElementLayout(element).yPos ||
        (getElementLayout(candidate).yPos === getElementLayout(element).yPos &&
          getElementLayout(candidate).xPos > getElementLayout(element).xPos),
    );

    if (nextSibling) {
      reordered.splice(
        reordered.findIndex((candidate) => candidate.id === nextSibling.id),
        0,
        element,
      );
    } else if (targetSiblings.length > 0) {
      const lastSibling = targetSiblings[targetSiblings.length - 1];
      reordered.splice(
        reordered.findIndex((candidate) => candidate.id === lastSibling.id) + 1,
        0,
        element,
      );
    } else if (targetSectionId) {
      const headingIndex = reordered.findIndex((candidate) => candidate.id === targetSectionId);
      reordered.splice(headingIndex + 1, 0, element);
    } else {
      reordered.push(element);
    }
  }

  return normalizeElementRevealOrder(reordered);
}

/**
 * Adds new elements (created, pasted, duplicated, drawn) and places each one in the reveal order
 * of the section it lands in, according to its position on the canvas, instead of appending it
 * to the end of the whole board.
 */
export function insertElementsInRevealOrder(
  elements: readonly BoardElement[],
  insertedElements: readonly BoardElement[],
): BoardElement[] {
  return reconcileElementRevealOrder(
    [...elements, ...insertedElements],
    getElementSectionMap(elements),
  );
}

export type RevealPlacement = 'before' | 'after';

/**
 * Elements whose reveal order can be swapped with the given element: headings of the same level
 * in the same section (sorted by position), or the non-heading elements of the same section
 * (in reveal order).
 */
export function getRevealSiblings(elements: readonly BoardElement[], id: string): BoardElement[] {
  const sectionById = getElementSectionMap(elements);
  const element = elements.find((candidate) => candidate.id === id);
  if (!element || !sectionById.has(id)) {
    return [];
  }
  const sectionId = sectionById.get(id);

  if (isHeading(element)) {
    return elements
      .filter(isHeading)
      .filter(
        (candidate) =>
          candidate.data.level === element.data.level &&
          sectionById.get(candidate.id) === sectionId,
      )
      .sort(comparePosition(elements));
  }

  return elements.filter(
    (candidate) => !isHeading(candidate) && sectionById.get(candidate.id) === sectionId,
  );
}

/** Moves an element one step earlier (-1) or later (1) in the reveal order of its section. */
export function moveElementInRevealOrder(
  elements: readonly BoardElement[],
  id: string,
  direction: -1 | 1,
): BoardElement[] | undefined {
  const siblings = getRevealSiblings(elements, id);
  const index = siblings.findIndex((candidate) => candidate.id === id);
  const target = siblings[index + direction];
  if (index < 0 || !target) {
    return undefined;
  }

  return moveElementInSection(elements, id, target.id, direction < 0 ? 'before' : 'after');
}

/**
 * Moves an element before or after another element of the same section. Headings move together
 * with their whole section (see {@link moveHeadingSection}).
 */
export function moveElementInSection(
  elements: readonly BoardElement[],
  sourceId: string,
  targetId: string,
  placement: RevealPlacement,
): BoardElement[] | undefined {
  const source = elements.find((element) => element.id === sourceId);
  if (source && isHeading(source)) {
    return moveHeadingSection(elements, sourceId, targetId, placement);
  }

  const sectionById = getElementSectionMap(elements);
  const target = elements.find((element) => element.id === targetId);
  if (
    !source ||
    !target ||
    sourceId === targetId ||
    sectionById.get(sourceId) !== sectionById.get(targetId)
  ) {
    return undefined;
  }

  const reordered = [...elements];
  reordered.splice(
    reordered.findIndex((element) => element.id === sourceId),
    1,
  );
  reordered.splice(
    reordered.findIndex((element) => element.id === targetId) + (placement === 'after' ? 1 : 0),
    0,
    source,
  );
  return normalizeElementRevealOrder(reordered);
}

/**
 * Moves a heading together with its whole section before or after a heading of the same level
 * in the same section. The sections are also rearranged on the canvas, because section
 * membership is derived from the canvas position.
 */
export function moveHeadingSection(
  elements: readonly BoardElement[],
  sourceId: string,
  targetId: string,
  placement: RevealPlacement,
): BoardElement[] | undefined {
  const workingElements = elements.map(cloneElement);
  const sectionById = getElementSectionMap(workingElements);
  const source = workingElements.find((element) => element.id === sourceId);
  const target = workingElements.find((element) => element.id === targetId);
  if (
    !source ||
    !target ||
    !isHeading(source) ||
    !isHeading(target) ||
    sourceId === targetId ||
    source.data.level !== target.data.level ||
    sectionById.get(sourceId) !== sectionById.get(targetId)
  ) {
    return undefined;
  }

  const peers = workingElements
    .filter(isHeading)
    .filter(
      (element) =>
        element.data.level === source.data.level &&
        sectionById.get(element.id) === sectionById.get(sourceId),
    )
    .sort(comparePosition(workingElements));
  const sourceIndex = peers.findIndex((heading) => heading.id === sourceId);
  const targetIndex = peers.findIndex((heading) => heading.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) {
    return undefined;
  }
  if (
    (placement === 'before' && sourceIndex + 1 === targetIndex) ||
    (placement === 'after' && targetIndex + 1 === sourceIndex)
  ) {
    return undefined;
  }

  const blocks = peers.map((heading) => ({
    heading,
    members: getHeadingSectionMembers(workingElements, heading),
  }));
  const gaps = blocks.map((block, index) => {
    const nextHeading = blocks[index + 1]?.heading;
    if (!nextHeading) {
      return 0;
    }
    const lastPosition = Math.max(
      ...block.members.map((element) => getElementLayout(element).yPos), //getElementLayout ok?
    );
    return Math.max(0, nextHeading.layout.yPos - lastPosition - 1);
  });
  const reorderedBlocks = [...blocks];
  const [sourceBlock] = reorderedBlocks.splice(sourceIndex, 1);
  reorderedBlocks.splice(
    reorderedBlocks.findIndex((block) => block.heading.id === targetId) +
      (placement === 'after' ? 1 : 0),
    0,
    sourceBlock,
  );

  let nextY = peers[0].layout.yPos;
  for (let index = 0; index < reorderedBlocks.length; index++) {
    const block = reorderedBlocks[index];
    const offset = nextY - block.heading.layout.yPos;
    for (const member of block.members) {
      moveElementY(member, offset);
    }
    const lastPosition = Math.max(
      ...block.members.map((element) => getElementLayout(element).yPos),
    );
    nextY = lastPosition + 1 + gaps[index];
  }

  const blockIds = new Set(blocks.flatMap((block) => block.members.map((element) => element.id)));
  const firstBlockIndex = workingElements.findIndex((element) => blockIds.has(element.id));
  const reorderedMembers = reorderedBlocks.flatMap((block) =>
    workingElements.filter((element) => block.members.some((member) => member.id === element.id)),
  );
  const combined: BoardElement[] = [];
  workingElements.forEach((element, index) => {
    if (index === firstBlockIndex) {
      combined.push(...reorderedMembers);
    }
    if (!blockIds.has(element.id)) {
      combined.push(element);
    }
  });

  return normalizeElementRevealOrder(combined);
}

function getHeadingSectionMembers(
  elements: readonly BoardElement[],
  heading: EditorElement<EditorElementType.Heading>,
): BoardElement[] {
  const positionedElements = [...elements].sort(comparePosition(elements));
  const headingIndex = positionedElements.findIndex((element) => element.id === heading.id);
  const members: BoardElement[] = [];

  for (let index = headingIndex; index < positionedElements.length; index++) {
    const element = positionedElements[index];
    if (index > headingIndex && isHeading(element) && element.data.level <= heading.data.level) {
      break;
    }
    members.push(element);
  }

  return members;
}

function comparePosition(elements: readonly BoardElement[]) {
  const originalIndex = new Map(elements.map((element, index) => [element.id, index]));
  return (a: BoardElement, b: BoardElement) =>
    getElementLayout(a).yPos - getElementLayout(b).yPos ||
    getElementLayout(a).xPos - getElementLayout(b).xPos ||
    originalIndex.get(a.id)! - originalIndex.get(b.id)!;
}

function isHeading(element: BoardElement): element is EditorElement<EditorElementType.Heading> {
  return element.type === EditorElementType.Heading;
}

function moveElementY(element: BoardElement, offset: number): void {
  if (element.type === GROUP_ELEMENT_TYPE) {
    for (const child of element.data.children) {
      moveElementY(child, offset);
    }

    return;
  }

  element.layout = {
    ...element.layout,
    yPos: element.layout.yPos + offset,
  };
}

function cloneElement(element: BoardElement): BoardElement {
  if (element.type === GROUP_ELEMENT_TYPE) {
    return {
      ...element,
      data: {
        children: element.data.children.map(cloneElement),
      },
    };
  }

  return {
    ...element,
    layout: { ...element.layout },
  };
}
