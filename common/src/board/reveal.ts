import { findBoardElementById, flattenBoardElements } from '../main';
import { BoardElement, EditorElement } from './element';

/**
 * Leaf elements in the order the projector reveals them. Groups are expanded into their
 * children, speaker notes are skipped because they are never shown on the projector.
 */
export function getRevealSteps(elements: readonly BoardElement[]): EditorElement[] {
  return flattenBoardElements(elements).filter((element) => !element.display.speakerNote);
}

/** The element the next "reveal next" step will show, if any element is still hidden. */
export function getNextRevealElement(elements: readonly BoardElement[]): EditorElement | undefined {
  return getRevealSteps(elements).find((element) => !element.display.visible);
}

/** The element the next "unreveal" step will hide, if any element is visible. */
export function getLastRevealedElement(
  elements: readonly BoardElement[],
): EditorElement | undefined {
  return getRevealSteps(elements).findLast((element) => element.display.visible);
}

/** 1-based reveal step per leaf element id. Speaker notes have no step. */
export function getRevealStepNumbers(elements: readonly BoardElement[]): Map<string, number> {
  return new Map(getRevealSteps(elements).map((element, index) => [element.id, index + 1]));
}

/**
 * Shows every reveal step up to and including the given element and hides all later steps.
 * For a group, the step of its last child is used. Returns whether anything changed.
 */
export function revealUpTo(elements: readonly BoardElement[], id: string): boolean {
  const target = findBoardElementById(elements, id);
  const targetIds = new Set(target ? flattenBoardElements([target]).map((leaf) => leaf.id) : []);
  const steps = getRevealSteps(elements);
  const lastIndex = steps.findLastIndex((element) => targetIds.has(element.id));
  if (lastIndex < 0) {
    return false;
  }

  let changed = false;
  steps.forEach((element, index) => {
    const visible = index <= lastIndex;
    if (element.display.visible !== visible) {
      element.display.visible = visible;
      changed = true;
    }
  });
  return changed;
}

/** Shows or hides all elements at once. Speaker notes always stay hidden. */
export function setAllElementsVisible(elements: readonly BoardElement[], visible: boolean): void {
  for (const element of flattenBoardElements(elements)) {
    element.display.visible = visible && !element.display.speakerNote;
  }
}
