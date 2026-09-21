export type BoardElement = EditorElement; // Todo: Replace with new Element type when we have it defined
// Todo: Add additional element types
export enum EditorElementType {
  Heading = 'heading',
  Text = 'text',
  Code = 'code',
  Image = 'image',
  Shape = 'shape',
  Arrow = 'arrow',
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
