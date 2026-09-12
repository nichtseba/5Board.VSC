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
    style?: 'solid' | 'dashed' | 'dotted';
    radius?: number;
  };
};

/**
 * All Editor Element Data Types
 */

type EditorElementDataMap = {
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
  textStyle?: TextStyle;
};

export type TextElementData = {
  content: string;
  textStyle?: TextStyle;
};

export type TextStyle = {
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
 * A freehand drawing is a list of strokes. Each stroke is one continuous
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
