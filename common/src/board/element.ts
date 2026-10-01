import type { JSONContent } from '@tiptap/core';
import { TranslationKey } from '../localization/index.js';

export type BoardElement = EditorElement; // Todo: Replace with new Element type when we have it defined
// Todo: Add additional element types
export enum EditorElementType {
  Heading = 'heading',
  Text = 'text',
  Code = 'code',
  Image = 'image',
  Rectangle = 'rectangle',
  Circle = 'circle',
  Line = 'line',
  Freehand = 'freehand',
  TableOfContents = 'tableOfContents',
}

/**
 * Editor Element Base Types
 */
export type EditorElement<T extends EditorElementType = EditorElementType> = {
  id: string;
  name?: string;
  type: T;

  layout: ElementLayout;
  style: ElementStyle;
  display: ElementDisplay;
  data: EditorElementDataMap[T];
};

export type ElementLayout = {
  yPos: number;
  xPos: number;

  height: number;
  width: number;

  rotation?: number;
  zIndex?: number;
};

export type ElementStyle = {
  color?: string;
  backgroundColor?: string;

  visible: boolean;
  opacity?: number;

  border?: {
    color?: string;
    width?: number;
    style?: LineStyle;
    radius?: number;
  };
};

export type ElementDisplay = {
  visible: boolean;
  speakerNote: boolean;
  excludeFromExport: boolean;
};

/**
 * All Editor Element Data Types
 */

export type EditorElementDataMap = {
  [EditorElementType.Heading]: HeadingElementData;
  [EditorElementType.Text]: TextElementData;
  [EditorElementType.Code]: CodeElementData;
  [EditorElementType.Image]: ImageElementData;
  [EditorElementType.Rectangle]: undefined; // No need for extra data
  [EditorElementType.Circle]: undefined; // No need for extra data
  [EditorElementType.Line]: LineElementData;
  [EditorElementType.Freehand]: FreehandElementData;
  [EditorElementType.TableOfContents]: TableOfContentsElementData;
};

export type HeadingElementData = {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  content: string;
  textStyle?: TextStyleH;
};

export type TextStyleH = {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
  fontStyle?: 'normal' | 'italic' | 'oblique';
  textDecoration?: TextDecorationStyle;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
};

export type TextDecorationStyle = {
  underline?: boolean;
  overline?: boolean;
  lineThrough?: boolean;
};

export type TextElementData = {
  content: JSONContent;
  tiptap?: Tiptap;
};

export type Tiptap = {
  marks?: Marks;
  nodes?: Nodes;
};

export type Marks = {
  bold?: boolean;
  code?: boolean;
  italic?: boolean;
  link?: boolean;
  strike?: boolean;
  underline?: boolean;
  textStyle?: TextStyle;
};

export type Nodes = {
  blockquote?: boolean;
  bulletList?: boolean;
  codeBlock?: boolean;
  orderedList?: boolean;

  attributes?: NodeAttributes;
};

export type TextStyle = {
  fontFamily?: string;
  fontSize?: string;
  lineHeight?: string;
  color?: string;
  backgroundColor?: string;
};

export type NodeAttributes = {
  textAlign?: 'left' | 'center' | 'right' | 'justify';
};

export type CodeElementData = {
  className: string;
  language: string;
  /**
   * Transcript of the most recent run. Stored on the element so it survives a webview reload
   * and shows up in the projector, which renders from the same document.
   */
  lastOutput?: CodeExecutionOutput;
  outputCollapsed?: boolean;
};

/**
 * One ordered piece of a run's transcript.
 *
 * `in` is what the user typed. Pipes do not echo, so nothing would record it otherwise and a
 * stored transcript of an interactive program would show prompts with no answers.
 */
// `system`: message from 5Board itself (no JDK, output limit …), not from program or compiler.
export type TranscriptSegmentKind = 'out' | 'err' | 'in' | 'system';

export type TranscriptSegment = {
  kind: TranscriptSegmentKind;
  text: string;
};

export type CodeExecutionOutput = {
  /** stdout, stderr and the user's input in the order they actually happened. */
  transcript: TranscriptSegment[];
  success: boolean;
  exitCode: number | null;
  /** Set when the output cap stopped the process before it could finish on its own. */
  truncated?: boolean;
};

export type ImageElementData = {
  src: string;
  content: string;

  title?: string;
  altText?: string;

  hideInExport?: boolean;

  configuredWidth?: boolean;
  aspectRatio?: number;
  cropData?: CropData;
};
export type CropData = {
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
};

/* A freehand drawing is a list of strokes. Each stroke is one continuous
 * pen movement (pen-down until pen-up) and is rendered as its own line.
 */
export type FreehandElementData = {
  strokes: FreehandStroke[];
};

/** Line rendering style shared by strokes (and reusable elsewhere).
 * 'custom' uses a numeric dash scale instead of a fixed pattern. */
export type LineStyle = 'solid' | 'dashed' | 'dotted' | 'custom';
type Point = { x: number; y: number };
export type FreehandStroke = {
  /**
   * The sampled points of the stroke, in normalized coordinates (0..1)
   * relative to the element's bounding box. Normalizing keeps the drawing
   * resolution-independent so it scales correctly in the projector.
   */
  points: Point[];
  /** Stroke color; falls back to the editor foreground color when omitted. */
  color?: string;
  /** Stroke width in screen pixels; stays constant while the element scales. */
  width?: number;
  /** Dash rendering of the line; defaults to solid when omitted. */
  lineStyle?: LineStyle;
  /** Dash/gap size (multiple of width) when lineStyle is 'custom'. */
  dashScale?: number;
  /** Render as straight segments (no smoothing), e.g. pen-tool polylines. */
  straight?: boolean;
};

export type LineElementData = {
  headTypeStart?: 'none' | 'arrow' | 'circle' | 'square';
  headTypeEnd?: 'none' | 'arrow' | 'circle' | 'square';
  headSize?: number;
  headFill?: boolean;
  points: { x: number; y: number }[]; // Start and end points for the line
};

type TableOfContentsElementData = {
  title?: string;
  fontSize?: number;
};

/**
 * All Editor Element Defaults when creating a new element
 */
export type AddElementPlacementMode = 'free' | 'fullRow' | 'fixed' | 'click';

export type AddElementDefaults<T extends EditorElementType = EditorElementType> = {
  layout?: Partial<Omit<ElementLayout, 'xPos' | 'yPos'>>;
  style?: Partial<ElementStyle>;
  data?: Partial<EditorElementDataMap[T]>;
  asset?: {
    name: string;
    bytes: number[];
  };
};

export type ElementTypeDefinition<T extends EditorElementType = EditorElementType> = {
  label: TranslationKey;
  icon: string;
  placement: AddElementPlacementMode;
  profile: {
    layout: Omit<ElementLayout, 'xPos' | 'yPos'>;
    data: EditorElementDataMap[T];
  };
};

export const DEFAULT_ELEMENT_PROFILES = {
  [EditorElementType.Heading]: {
    layout: { width: 40, height: 3 },
    style: {
      visible: true,
    },
    data: { level: 1, content: 'Heading' },
  },
  [EditorElementType.Text]: {
    layout: { width: 20, height: 3 },
    style: {
      visible: true,
    },
    data: {
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Enter text here... ',
                marks: [{ type: 'textStyle', attrs: { fontSize: 12 } }],
              },
            ],
          },
        ],
      },
    },
  },
  [EditorElementType.Code]: {
    layout: { width: 40, height: 10 },
    style: {
      visible: true,
    },
    // className is derived from the id when the element is created.
    data: { className: '', language: 'java' },
  },
  [EditorElementType.Image]: {
    layout: { width: 20, height: 10 },
    style: {
      visible: true,
    },
    data: { src: '', content: '', altText: 'Image', configuredWidth: true },
  },
  [EditorElementType.Rectangle]: {
    layout: { width: 20, height: 10 },
    style: {
      visible: true,
      backgroundColor: 'var(--vscode-foreground)',
      border: {
        width: 2,
      },
    },
    data: undefined,
  },
  [EditorElementType.Circle]: {
    layout: { width: 20, height: 10 },
    style: {
      visible: true,
      backgroundColor: 'var(--vscode-foreground)',
      border: {
        width: 2,
      },
    },
    data: undefined,
  },
  [EditorElementType.Line]: {
    layout: { width: 12, height: 4 },
    style: {
      visible: true,
      opacity: 1,
      border: {
        color: 'var(--vscode-foreground)',
        width: 2,
        style: 'solid',
      },
    },
    data: {
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
    },
  },
  // This is just a filler here to satisfie the type. Freehand is added with a different tool
  [EditorElementType.Freehand]: {
    layout: { width: 10, height: 10 },
    style: {
      visible: true,
    },
    data: { strokes: [] },
  },
  [EditorElementType.TableOfContents]: {
    layout: { width: 40, height: 10 },
    style: {
      visible: true,
    },
    data: {},
  },
} satisfies {
  [K in EditorElementType]: {
    layout: Omit<ElementLayout, 'xPos' | 'yPos'>;
    style: ElementStyle;
    data: EditorElementDataMap[K];
  };
};

export const ELEMENT_TYPE_DEFINITIONS = {
  [EditorElementType.Heading]: {
    label: 'webview.sidebar.elementType.heading',
    icon: 'text-size',
    placement: 'fullRow',
    profile: DEFAULT_ELEMENT_PROFILES[EditorElementType.Heading],
  },
  [EditorElementType.Text]: {
    label: 'webview.sidebar.elementType.text',
    icon: 'symbol-string',
    placement: 'free',
    profile: DEFAULT_ELEMENT_PROFILES[EditorElementType.Text],
  },
  [EditorElementType.Code]: {
    label: 'webview.sidebar.elementType.code',
    icon: 'code',
    placement: 'fullRow',
    profile: DEFAULT_ELEMENT_PROFILES[EditorElementType.Code],
  },
  [EditorElementType.Image]: {
    label: 'webview.sidebar.elementType.image',
    icon: 'file-media',
    placement: 'free',
    profile: DEFAULT_ELEMENT_PROFILES[EditorElementType.Image],
  },
  [EditorElementType.Rectangle]: {
    label: 'webview.sidebar.elementType.rectangle',
    icon: 'primitive-square',
    placement: 'click',
    profile: DEFAULT_ELEMENT_PROFILES[EditorElementType.Rectangle],
  },
  [EditorElementType.Circle]: {
    label: 'webview.sidebar.elementType.circle',
    icon: 'circle',
    placement: 'click',
    profile: DEFAULT_ELEMENT_PROFILES[EditorElementType.Circle],
  },
  [EditorElementType.Line]: {
    label: 'webview.sidebar.elementType.line',
    icon: 'dash',
    placement: 'click',
    profile: DEFAULT_ELEMENT_PROFILES[EditorElementType.Line],
  },
  // This is just a filler here to satisfie the type. Freehand is added with a different tool
  [EditorElementType.Freehand]: {
    label: 'webview.sidebar.elementType.freehand',
    icon: 'pencil',
    placement: 'free',
    profile: DEFAULT_ELEMENT_PROFILES[EditorElementType.Freehand],
  },
  [EditorElementType.TableOfContents]: {
    label: 'webview.sidebar.elementType.tableOfContents',
    icon: 'list-unordered',
    placement: 'free',
    profile: DEFAULT_ELEMENT_PROFILES[EditorElementType.TableOfContents],
  },
} as const satisfies {
  [K in EditorElementType]: ElementTypeDefinition<K>;
};
export function getElementTypeDefinition<T extends EditorElementType>(type: T) {
  return ELEMENT_TYPE_DEFINITIONS[type];
}
export function getCustomElementTypes(): [] {
  return [];
}
