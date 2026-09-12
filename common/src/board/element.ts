import type { JSONContent } from '@tiptap/core';

export type BoardElement = EditorElement; // Todo: Replace with new Element type when we have it defined
// Todo: Add additional element types
export enum EditorElementType {
  Heading = 'heading',
  Text = 'text',
  Code = 'code',
  Image = 'image',
  Shape = 'shape',
  Arrow = 'arrow',
  Freehand = 'freehand',
}

/**
 * Editor Element Base Types
 */
export type EditorElement<T extends EditorElementType = EditorElementType> = {
  id: string;
  type: T;

  layout: ElementLayout;
  style: ElementStyle;

  data: EditorElementDataMap[T];
};

export type ElementLayout = {
  yPos: number;
  xPos: number;

  height: number;
  width: number;

  rotation?: number;
  //z-index?: number;
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

/**
 * All Editor Element Data Types
 */

export type EditorElementDataMap = {
  [EditorElementType.Heading]: HeadingElementData;
  [EditorElementType.Text]: TextElementData;
  [EditorElementType.Code]: CodeElementData;
  [EditorElementType.Image]: ImageElementData;
  [EditorElementType.Shape]: ShapeElementData;
  [EditorElementType.Arrow]: ArrowElementData;
  [EditorElementType.Freehand]: FreehandElementData;
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
  codeBlockId: string;
  fileName?: string;
  language?: string;

  content: string;
  output?: string;
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

export type ArrowElementData = {
  headTypeStart?: 'none' | 'arrow' | 'circle' | 'square';
  headTypeEnd?: 'none' | 'arrow' | 'circle' | 'square';
  headSize?: number;
  headFill?: boolean;
  points: { x: number; y: number }[]; // Start and end points for the arrow
};

export type ShapeElementData =
  | RectangleShapeData
  | EllipseShapeData
  | LineShapeData
  | PolygonShapeData;

type Point = { x: number; y: number };

type BaseShapeData = {
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  shapeType: 'rectangle' | 'ellipse' | 'line' | 'polygon';
};

type RectangleShapeData = BaseShapeData & {
  shapeType: 'rectangle';
  radius?: number;
};

type EllipseShapeData = BaseShapeData & {
  shapeType: 'ellipse';
  rx: number;
  ry: number;
};

type LineShapeData = BaseShapeData & {
  shapeType: 'line';
  points: [Point, Point];
};

type PolygonShapeData = BaseShapeData & {
  shapeType: 'polygon';
  points: Point[];
};

/**
 * All Editor Element Defaults when creating a new element
 */
export type AddElementPlacementMode = 'free' | 'fullRow' | 'fixed' | 'custom';
export type ElementCategory = 'basic' | 'custom';

export type AddElementDefaults<T extends EditorElementType = EditorElementType> = {
  layout?: Partial<Omit<ElementLayout, 'xPos' | 'yPos'>>;
  style?: Partial<ElementStyle>;
  data?: Partial<EditorElementDataMap[T]>;
};

export type ElementTypeDefinition<T extends EditorElementType = EditorElementType> = {
  label: string;
  category: ElementCategory;
  placement: AddElementPlacementMode;
  profile: {
    layout: Omit<ElementLayout, 'xPos' | 'yPos'>;
    data: EditorElementDataMap[T];
  };
};

export const DEFAULT_ELEMENT_PROFILES = {
  [EditorElementType.Heading]: {
    layout: { width: 40, height: 2 },
    data: { level: 1, content: 'Heading' },
  },
  [EditorElementType.Text]: {
    layout: { width: 20, height: 10 },
    data: { content: {} },
  },
  [EditorElementType.Code]: {
    layout: { width: 40, height: 10 },
    data: { codeBlockId: '', content: '', language: 'plaintext' },
  },
  [EditorElementType.Image]: {
    layout: { width: 20, height: 10 },
    data: { src: '', content: '', altText: 'Image' },
  },
  [EditorElementType.Shape]: {
    layout: { width: 8, height: 6 },
    data: { shapeType: 'rectangle' },
  },
  [EditorElementType.Arrow]: {
    layout: { width: 12, height: 4 },
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
    data: { strokes: [] },
  },
} satisfies {
  [K in EditorElementType]: {
    layout: Omit<ElementLayout, 'xPos' | 'yPos'>;
    data: EditorElementDataMap[K];
  };
};

export const ELEMENT_TYPE_DEFINITIONS = {
  [EditorElementType.Heading]: {
    label: 'Heading',
    category: 'basic',
    placement: 'fullRow',
    profile: DEFAULT_ELEMENT_PROFILES[EditorElementType.Heading],
  },
  [EditorElementType.Text]: {
    label: 'Text',
    category: 'basic',
    placement: 'free',
    profile: DEFAULT_ELEMENT_PROFILES[EditorElementType.Text],
  },
  [EditorElementType.Code]: {
    label: 'Code',
    category: 'basic',
    placement: 'fullRow',
    profile: DEFAULT_ELEMENT_PROFILES[EditorElementType.Code],
  },
  [EditorElementType.Image]: {
    label: 'Image',
    category: 'basic',
    placement: 'free',
    profile: DEFAULT_ELEMENT_PROFILES[EditorElementType.Image],
  },
  [EditorElementType.Shape]: {
    label: 'Shape',
    category: 'basic',
    placement: 'free',
    profile: DEFAULT_ELEMENT_PROFILES[EditorElementType.Shape],
  },
  [EditorElementType.Arrow]: {
    label: 'Arrow',
    category: 'basic',
    placement: 'free',
    profile: DEFAULT_ELEMENT_PROFILES[EditorElementType.Arrow],
  },
  // This is just a filler here to satisfie the type. Freehand is added with a different tool
  [EditorElementType.Freehand]: {
    label: 'Freehand',
    category: 'basic',
    placement: 'free',
    profile: DEFAULT_ELEMENT_PROFILES[EditorElementType.Freehand],
  },
} as const satisfies {
  [K in EditorElementType]: ElementTypeDefinition<K>;
};

export function getElementTypeDefinition<T extends EditorElementType>(type: T) {
  return ELEMENT_TYPE_DEFINITIONS[type];
}

export function getBasicElementTypes() {
  return Object.entries(ELEMENT_TYPE_DEFINITIONS).filter(
    ([, definition]) => definition.category === 'basic',
  ) as [EditorElementType, (typeof ELEMENT_TYPE_DEFINITIONS)[EditorElementType]][];
}

export function getCustomElementTypes(): [] {
  return [];
}
