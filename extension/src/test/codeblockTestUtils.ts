import {
  BoardDocument,
  CodeElementData,
  EditorElementType,
  sanitizeClassName,
} from '5board.vsc-common';
import type { EditorElement } from '5board.vsc-common';

export function makeCodeElement(id: string, data: Partial<CodeElementData> = {}): EditorElement {
  return {
    id,
    type: EditorElementType.Code,
    layout: { xPos: 0, yPos: 0, width: 100, height: 100 },
    style: { visible: true },
    data: {
      className: data.className ?? sanitizeClassName(id),
      language: data.language ?? 'java',
    },
  };
}

export function makeDocument(elements: EditorElement[]): BoardDocument {
  return {
    manifest: { title: 'test', createdAt: 0, modifiedAt: 0, version: '1' },
    content: { selectedElementIds: [], primarySelectedElementId: null, elements, codeClasses: [] },
    sources: [],
    assets: [],
  };
}

export function data(doc: BoardDocument, elementId: string): CodeElementData {
  return doc.content.elements.find((e) => e.id === elementId)!.data as CodeElementData;
}
