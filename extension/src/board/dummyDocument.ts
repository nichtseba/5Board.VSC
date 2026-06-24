import { BoardDocument, EditorElementType } from '5board.vsc-common';

/**
 * Fallback document shown in the projector when a .5boardz file has no elements.
 *
 * This is a development aid — remove this file (and the usage in editorProvider.ts)
 * once the editor can write real content into .5boardz files.
 */
export const DUMMY_BOARD_DOCUMENT: BoardDocument = {
  manifest: {
    title: 'Demo Presentation',
    createdAt: 0,
    modifiedAt: 0,
    version: '1.0.0',
  },
  content: {
    selectedElementId: null,
    elements: [
      {
        id: 'dummy-1',
        type: EditorElementType.Heading,
        layout: { yPos: 0, xPos: 0, height: 10, width: 100 },
        style: { visible: true },
        data: { level: 1, content: 'Welcome to 5Board' },
      },
      {
        id: 'dummy-2',
        type: EditorElementType.Text,
        layout: { yPos: 15, xPos: 0, height: 8, width: 100 },
        style: { visible: true },
        data: { content: 'This is a placeholder slide. Add real content to your .5boardz file.' },
      },
      {
        id: 'dummy-3',
        type: EditorElementType.Heading,
        layout: { yPos: 30, xPos: 0, height: 8, width: 100 },
        style: { visible: true },
        data: { level: 2, content: 'Slide 2: Another Topic' },
      },
      {
        id: 'dummy-4',
        type: EditorElementType.Text,
        layout: { yPos: 42, xPos: 0, height: 8, width: 100 },
        style: { visible: true },
        data: { content: 'More placeholder text. Replace with actual lecture content.' },
      },
      {
        id: 'dummy-5',
        type: EditorElementType.Heading,
        layout: { yPos: 57, xPos: 0, height: 8, width: 100 },
        style: { visible: true },
        data: { level: 2, content: 'Slide 3: Summary' },
      },
      {
        id: 'dummy-6',
        type: EditorElementType.Text,
        layout: { yPos: 68, xPos: 0, height: 8, width: 100 },
        style: { visible: true },
        data: { content: 'Dummy slide — file format implementation in progress.' },
      },
    ],
  },
  sources: [],
  assets: [],
};
