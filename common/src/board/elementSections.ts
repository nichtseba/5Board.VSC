import { BoardElement, EditorElement, EditorElementType } from './element';

export type ElementSectionMap = Map<string, string | null>;

export function getElementSectionMap(elements: readonly BoardElement[]): ElementSectionMap {
  const sectionById: ElementSectionMap = new Map();
  const headingStack: EditorElement<EditorElementType.Heading>[] = [];
  const positionedElements = elements
    .map((element, index) => ({ element, index }))
    .sort(
      (a, b) =>
        a.element.layout.yPos - b.element.layout.yPos ||
        a.element.layout.xPos - b.element.layout.xPos ||
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
        a.layout.yPos - b.layout.yPos ||
        a.layout.xPos - b.layout.xPos ||
        originalOrder.get(a.id)! - originalOrder.get(b.id)!,
    );
  const reordered = [...elements];

  for (const element of movedElements) {
    const currentIndex = reordered.findIndex((candidate) => candidate.id === element.id);
    if (currentIndex < 0) {
      continue;
    }
    reordered.splice(currentIndex, 1);

    const targetSectionId = nextSections.get(element.id) ?? null;
    const targetSiblings = reordered.filter(
      (candidate) => nextSections.get(candidate.id) === targetSectionId,
    );
    const nextSibling = targetSiblings.find(
      (candidate) =>
        candidate.layout.yPos > element.layout.yPos ||
        (candidate.layout.yPos === element.layout.yPos &&
          candidate.layout.xPos > element.layout.xPos),
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

export function moveElementBeforeInSection(
  elements: readonly BoardElement[],
  sourceId: string,
  targetId: string,
): BoardElement[] | undefined {
  const sectionById = getElementSectionMap(elements);
  const source = elements.find((element) => element.id === sourceId);
  const target = elements.find((element) => element.id === targetId);
  if (
    !source ||
    !target ||
    sourceId === targetId ||
    isHeading(source) ||
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
    reordered.findIndex((element) => element.id === targetId),
    0,
    source,
  );
  return normalizeElementRevealOrder(reordered);
}

export function moveHeadingSectionBefore(
  elements: readonly BoardElement[],
  sourceId: string,
  targetId: string,
): BoardElement[] | undefined {
  const workingElements = elements.map((element) => ({
    ...element,
    layout: { ...element.layout },
  }));
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
  if (sourceIndex + 1 === targetIndex) {
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
    const lastPosition = Math.max(...block.members.map((element) => element.layout.yPos));
    return Math.max(0, nextHeading.layout.yPos - lastPosition - 1);
  });
  const reorderedBlocks = [...blocks];
  const [sourceBlock] = reorderedBlocks.splice(sourceIndex, 1);
  reorderedBlocks.splice(
    reorderedBlocks.findIndex((block) => block.heading.id === targetId),
    0,
    sourceBlock,
  );

  let nextY = peers[0].layout.yPos;
  for (let index = 0; index < reorderedBlocks.length; index++) {
    const block = reorderedBlocks[index];
    const offset = nextY - block.heading.layout.yPos;
    for (const member of block.members) {
      member.layout = { ...member.layout, yPos: member.layout.yPos + offset };
    }
    const lastPosition = Math.max(...block.members.map((element) => element.layout.yPos));
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
    a.layout.yPos - b.layout.yPos ||
    a.layout.xPos - b.layout.xPos ||
    originalIndex.get(a.id)! - originalIndex.get(b.id)!;
}

function isHeading(element: BoardElement): element is EditorElement<EditorElementType.Heading> {
  return element.type === EditorElementType.Heading;
}
