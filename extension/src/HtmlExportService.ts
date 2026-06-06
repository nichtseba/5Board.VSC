import path from 'path';
import {
  EditorElementType,
  type Asset,
  type BoardDocument,
  type LegacyCodeObject,
  type LegacyEllipseObject,
  type LegacyImageObject,
  type LegacyObject,
  type LegacyObjectBase,
  type LegacyRectObject,
  type LegacySectionObject,
  type LegacyTextboxObject,
  type LegacyTextObjectBase,
} from '5board.vsc-common';

export type HtmlExportResult = {
  html: string;
  warnings: string[];
};

type RenderContext = {
  assetMap: Map<string, Asset>;
  warnings: string[];
};

type LegacyBounds = {
  minLeft: number;
  minTop: number;
  width: number;
  height: number;
};

type UnknownRecord = Record<string, unknown>;

export class HtmlExportService {
  // Builds printable HTML and warnings for a board document.
  public generate(document: BoardDocument, fileName: string): HtmlExportResult {
    const warnings: string[] = [];
    const title = document.manifest.title || path.basename(fileName, path.extname(fileName));
    const context: RenderContext = {
      assetMap: createAssetMap(document.assets),
      warnings,
    };
    const body = renderContent(document.content, title || '5Board Export', context);

    return {
      html: createHtmlDocument(title || '5Board Export', body),
      warnings,
    };
  }
}

// Chooses the renderer for the document content shape.
function renderContent(content: unknown, title: string, context: RenderContext): string {
  if (hasTypedElements(content) && content.elements.length > 0) {
    return renderTypedDocument(content.elements, title, context.warnings);
  }

  if (hasLegacyObjects(content)) {
    return renderLegacyDocument(content.objects, title, context);
  }

  return `<main class="fiveboard-export-document">
  <h1>${escapeText(title)}</h1>
  <section class="fiveboard-export-empty">No exportable board content found.</section>
</main>`;
}

// Checks whether content contains typed editor elements.
function hasTypedElements(value: unknown): value is { elements: unknown[] } {
  return isRecord(value) && Array.isArray(value.elements);
}

// Checks whether content contains legacy canvas objects.
function hasLegacyObjects(value: unknown): value is { objects: LegacyObject[] } {
  return isRecord(value) && Array.isArray(value.objects);
}

// Renders typed editor elements into the export document.
function renderTypedDocument(elements: unknown[], title: string, warnings: string[]): string {
  const renderedElements = elements
    .map((element, index) => renderTypedElement(element, index, warnings))
    .filter((element): element is string => element.length > 0)
    .join('\n');

  return `<main class="fiveboard-export-document">
  <h1 class="fiveboard-export-title">${escapeText(title)}</h1>
  <section class="fiveboard-export-canvas fiveboard-export-canvas--typed">
${renderedElements}
  </section>
</main>`;
}

// Renders one typed element or an unsupported placeholder.
function renderTypedElement(element: unknown, index: number, warnings: string[]): string {
  if (!isRecord(element)) {
    warnings.push(`Skipped typed element at index ${index}: not an object.`);
    return '';
  }

  const type = readString(element, 'type');
  const style = readRecord(element, 'style');
  if (style && readBoolean(style, 'visible') === false) {
    return '';
  }

  if (type === EditorElementType.Heading) {
    return renderTypedHeadingElement(element, getTypedElementGridStyle(element, style));
  }

  warnings.push(`Unsupported typed element "${readString(element, 'id') ?? index}" (${type}).`);
  return `<article class="fiveboard-export-element fiveboard-export-unsupported" style="${escapeAttribute(styleText(getTypedElementGridStyle(element, style)))}">
Unsupported element: ${escapeText(type ?? 'unknown')}
</article>`;
}

// Renders a typed heading element.
function renderTypedHeadingElement(element: UnknownRecord, gridStyle: string[]): string {
  const data = readRecord(element, 'data');
  const level = readHeadingLevel(data ? readNumber(data, 'level') : undefined);
  const content = data ? readString(data, 'content') : undefined;

  return `<article class="fiveboard-export-element fiveboard-export-heading" style="${escapeAttribute(styleText(gridStyle))}">
${renderHeading(level, content ?? '')}
</article>`;
}

// Converts typed element layout into CSS grid positioning.
function getTypedElementGridStyle(element: UnknownRecord, style?: UnknownRecord): string[] {
  const layout = readRecord(element, 'layout') ?? element;

  return [
    `grid-row-start: ${Math.max(1, Math.round(readNumber(layout, 'yPos') ?? 0) + 1)}`,
    `grid-row-end: span ${Math.max(1, Math.round(readNumber(layout, 'height') ?? 1))}`,
    `grid-column-start: ${Math.max(1, Math.round(readNumber(layout, 'xPos') ?? 0) + 1)}`,
    `grid-column-end: span ${Math.max(1, Math.round(readNumber(layout, 'width') ?? 40))}`,
    ...renderTypedElementStyle(style),
  ];
}

// Converts typed element style fields into inline CSS.
function renderTypedElementStyle(style: UnknownRecord | undefined): string[] {
  if (!style) {
    return [];
  }

  const color = readString(style, 'color');
  const backgroundColor = readString(style, 'backgroundColor');
  const opacity = readNumber(style, 'opacity');

  return [
    color ? `color: ${color}` : '',
    backgroundColor ? `background: ${backgroundColor}` : '',
    opacity === undefined ? '' : `opacity: ${roundCssNumber(opacity)}`,
  ];
}

// Renders legacy canvas objects into a positioned export canvas.
function renderLegacyDocument(
  objects: LegacyObject[],
  title: string,
  context: RenderContext,
): string {
  const visibleObjects = objects.filter(isRenderableLegacyObject);
  if (visibleObjects.length === 0) {
    return `<main class="fiveboard-export-document">
  <h1 class="fiveboard-export-title">${escapeText(title)}</h1>
  <section class="fiveboard-export-empty">No visible exportable objects found.</section>
</main>`;
  }

  const bounds = calculateLegacyBounds(visibleObjects);
  const renderedObjects = visibleObjects
    .map((object, index) => renderLegacyObject(object, index, bounds, context))
    .join('\n');

  return `<main class="fiveboard-export-document">
  <h1 class="fiveboard-export-title">${escapeText(title)}</h1>
  <section class="fiveboard-export-canvas fiveboard-export-canvas--legacy" style="width: ${Math.ceil(bounds.width)}px; min-height: ${Math.ceil(bounds.height)}px;">
${renderedObjects}
  </section>
</main>`;
}

// Dispatches a legacy object to its matching renderer.
function renderLegacyObject(
  object: LegacyObject,
  index: number,
  bounds: LegacyBounds,
  context: RenderContext,
): string {
  switch (object.type) {
    case 'textbox':
      return renderLegacyTextObject(object, bounds);
    case 'section':
      return renderLegacySectionObject(object, bounds);
    case 'code':
      return renderLegacyCodeObject(object, bounds);
    case 'image':
      return renderLegacyImageObject(object, index, bounds, context);
    case 'rect':
      return renderLegacyRectObject(object, bounds);
    case 'ellipse':
      return renderLegacyEllipseObject(object, bounds);
    default:
      context.warnings.push(`Unsupported legacy object "${object.id ?? index}" (${object.type}).`);
      return renderUnsupportedLegacyObject(object, bounds);
  }
}

// Renders a legacy textbox object.
function renderLegacyTextObject(object: LegacyTextboxObject, bounds: LegacyBounds): string {
  const styles = [
    ...renderLegacyBaseStyle(object, bounds),
    ...renderLegacyTextStyle(object),
    'white-space: pre-wrap',
  ];

  return `<div class="fiveboard-export-legacy-object fiveboard-export-legacy-text" style="${escapeAttribute(styleText(styles))}">${escapeText(object.text ?? '')}</div>`;
}

// Renders a legacy section object as a heading.
function renderLegacySectionObject(object: LegacySectionObject, bounds: LegacyBounds): string {
  const styles = [
    ...renderLegacyBaseStyle(object, bounds),
    ...renderLegacyTextStyle(object),
    'white-space: pre-wrap',
  ];
  const content = `${object.numbering ?? ''}${object.text ?? ''}`;
  const level = readHeadingLevel(Number.parseInt(object.sectionLevel ?? '2', 10));

  return `<div class="fiveboard-export-legacy-object fiveboard-export-legacy-section" style="${escapeAttribute(styleText(styles))}">
${renderHeading(level, content)}
</div>`;
}

// Renders a legacy code object.
function renderLegacyCodeObject(object: LegacyCodeObject, bounds: LegacyBounds): string {
  const styles = [
    ...renderLegacyBaseStyle(object, bounds),
    ...renderLegacyTextStyle(object),
    'white-space: pre',
    'overflow: visible',
  ];

  return `<pre class="fiveboard-export-legacy-object fiveboard-export-legacy-code" style="${escapeAttribute(styleText(styles))}"><code>${escapeText(object.text ?? '')}</code></pre>`;
}

// Renders a legacy image object using embedded asset data.
function renderLegacyImageObject(
  object: LegacyImageObject,
  index: number,
  bounds: LegacyBounds,
  context: RenderContext,
): string {
  if (!object.src) {
    context.warnings.push(`Image object "${object.id ?? index}" has no source.`);
    return '';
  }

  const dataUrl = resolveAssetSource(object.src, context.assetMap);
  if (!dataUrl) {
    context.warnings.push(`Image asset "${object.src}" was not found.`);
    return `<div class="fiveboard-export-legacy-object fiveboard-export-unsupported" style="${escapeAttribute(styleText(renderLegacyBaseStyle(object, bounds)))}">
Missing image: ${escapeText(object.src)}
</div>`;
  }

  const styles = [...renderLegacyBaseStyle(object, bounds), 'object-fit: contain'];
  return `<img class="fiveboard-export-legacy-object fiveboard-export-legacy-image" src="${escapeAttribute(dataUrl)}" alt="${escapeAttribute(object.altText ?? '')}" style="${escapeAttribute(styleText(styles))}">`;
}

// Renders a legacy rectangle object.
function renderLegacyRectObject(object: LegacyRectObject, bounds: LegacyBounds): string {
  return `<div class="fiveboard-export-legacy-shape fiveboard-export-legacy-rect" style="${escapeAttribute(styleText(renderLegacyBaseStyle(object, bounds)))}"></div>`;
}

// Renders a legacy ellipse object.
function renderLegacyEllipseObject(object: LegacyEllipseObject, bounds: LegacyBounds): string {
  return `<div class="fiveboard-export-legacy-shape fiveboard-export-legacy-ellipse" style="${escapeAttribute(styleText(renderLegacyBaseStyle(object, bounds)))}"></div>`;
}

// Renders a placeholder for unsupported legacy objects.
function renderUnsupportedLegacyObject(object: LegacyObject, bounds: LegacyBounds): string {
  return `<div class="fiveboard-export-legacy-object fiveboard-export-unsupported" style="${escapeAttribute(styleText(renderLegacyBaseStyle(object, bounds)))}">
Unsupported object: ${escapeText(object.type)}
</div>`;
}

// Converts common legacy geometry into inline CSS.
function renderLegacyBaseStyle(object: LegacyObjectBase, bounds: LegacyBounds): string[] {
  const left = object.left ?? 0;
  const top = object.top ?? 0;
  const width = object.width ?? 0;
  const height = object.height ?? 0;
  const scaleX = object.scaleX ?? 1;
  const scaleY = object.scaleY ?? 1;
  const angle = object.angle ?? 0;
  const fill = typeof object.fill === 'string' ? object.fill : undefined;
  const stroke = typeof object.stroke === 'string' ? object.stroke : undefined;

  return [
    'position: absolute',
    `left: ${roundCssNumber(left - bounds.minLeft)}px`,
    `top: ${roundCssNumber(top - bounds.minTop)}px`,
    `width: ${roundCssNumber(Math.max(0, width * scaleX))}px`,
    `min-height: ${roundCssNumber(Math.max(0, height * scaleY))}px`,
    angle === 0 ? '' : `transform: rotate(${roundCssNumber(angle)}deg)`,
    angle === 0 ? '' : 'transform-origin: top left',
    object.opacity === undefined ? '' : `opacity: ${roundCssNumber(object.opacity)}`,
    fill ? `color: ${fill}` : '',
    object.backgroundColor && object.backgroundColor !== 'transparent'
      ? `background: ${object.backgroundColor}`
      : '',
    stroke && object.strokeWidth
      ? `border: ${roundCssNumber(object.strokeWidth)}px solid ${stroke}`
      : '',
    'box-sizing: border-box',
  ];
}

// Converts legacy text style fields into inline CSS.
function renderLegacyTextStyle(object: LegacyTextObjectBase): string[] {
  const decorations = [
    object.underline ? 'underline' : '',
    object.overline ? 'overline' : '',
    object.linethrough ? 'line-through' : '',
  ].filter((value) => value.length > 0);

  return [
    object.fontSize === undefined ? '' : `font-size: ${roundCssNumber(object.fontSize)}px`,
    object.fontWeight === undefined ? '' : `font-weight: ${object.fontWeight}`,
    object.fontFamily === undefined ? '' : `font-family: ${object.fontFamily}`,
    object.fontStyle === undefined ? '' : `font-style: ${object.fontStyle}`,
    object.lineHeight === undefined ? '' : `line-height: ${roundCssNumber(object.lineHeight)}`,
    object.textAlign === undefined ? '' : `text-align: ${object.textAlign}`,
    decorations.length === 0 ? '' : `text-decoration: ${decorations.join(' ')}`,
  ];
}

// Calculates the bounding box for visible legacy objects.
function calculateLegacyBounds(objects: LegacyObject[]): LegacyBounds {
  const boxes = objects.map((object) => {
    const left = object.left ?? 0;
    const top = object.top ?? 0;
    const width = Math.max(0, object.width ?? 0);
    const height = Math.max(0, object.height ?? 0);
    const scaleX = object.scaleX ?? 1;
    const scaleY = object.scaleY ?? 1;

    return {
      left,
      top,
      right: left + width * scaleX,
      bottom: top + height * scaleY,
    };
  });

  const minLeft = Math.min(...boxes.map((box) => box.left));
  const minTop = Math.min(...boxes.map((box) => box.top));
  const maxRight = Math.max(...boxes.map((box) => box.right));
  const maxBottom = Math.max(...boxes.map((box) => box.bottom));

  return {
    minLeft,
    minTop,
    width: Math.max(1, maxRight - minLeft),
    height: Math.max(1, maxBottom - minTop),
  };
}

// Filters out hidden or export-disabled legacy objects.
function isRenderableLegacyObject(object: LegacyObject): boolean {
  return (
    object.visible !== false &&
    object.hidden !== true &&
    (!('hideInExport' in object) || object.hideInExport !== true) &&
    (!('isSpeakerNote' in object) || object.isSpeakerNote !== true)
  );
}

// Wraps rendered export body in a complete HTML document.
function createHtmlDocument(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeText(title)}</title>
  <style>
${EXPORT_CSS}
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

// Creates lookup keys for package assets.
function createAssetMap(assets: Asset[]): Map<string, Asset> {
  const map = new Map<string, Asset>();

  for (const asset of assets) {
    const assetName = normalizeAssetName(asset.name);
    map.set(assetName, asset);
    map.set(`assets/${assetName}`, asset);
  }

  return map;
}

// Resolves asset references to data URLs.
function resolveAssetSource(source: string, assetMap: Map<string, Asset>): string | null {
  if (source.startsWith('data:')) {
    return source;
  }

  const asset = assetMap.get(normalizeAssetName(source));
  if (!asset) {
    return null;
  }

  return `data:${asset.mime};base64,${Buffer.from(asset.bytes).toString('base64')}`;
}

// Escapes text for HTML text nodes.
function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Escapes text for HTML attributes.
function escapeAttribute(value: string): string {
  return escapeText(value).replace(/"/g, '&quot;');
}

// Joins CSS declarations for an inline style.
function styleText(styles: string[]): string {
  return styles.filter((style) => style.length > 0).join('; ');
}

// Rounds CSS numbers for readable output.
function roundCssNumber(value: number): string {
  return Number.isInteger(value)
    ? value.toString()
    : value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

// Checks whether a value is an object record.
function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Reads a record field.
function readRecord(record: UnknownRecord, key: string): UnknownRecord | undefined {
  const value = record[key];
  return isRecord(value) ? value : undefined;
}

// Reads a string field.
function readString(record: UnknownRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

// Reads a finite number field.
function readNumber(record: UnknownRecord, key: string): number | undefined {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

// Reads a boolean field.
function readBoolean(record: UnknownRecord, key: string): boolean | undefined {
  const value = record[key];
  return typeof value === 'boolean' ? value : undefined;
}

// Normalizes asset names for lookup.
function normalizeAssetName(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();
}

// Normalizes a value to a valid heading level.
function readHeadingLevel(value: number | undefined): 1 | 2 | 3 | 4 | 5 | 6 {
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5 || value === 6) {
    return value;
  }

  return 2;
}

// Renders an escaped heading tag.
function renderHeading(level: 1 | 2 | 3 | 4 | 5 | 6, content: string): string {
  return `<h${level}>${escapeText(content)}</h${level}>`;
}

const EXPORT_CSS = `@page {
  size: A4;
  margin: 12mm;
}

html,
body {
  margin: 0;
  background: #ffffff;
  color: #111111;
  font-family: Arial, Helvetica, sans-serif;
}

body {
  padding: 24px;
}

.fiveboard-export-document {
  width: max-content;
  max-width: 100%;
}

.fiveboard-export-title {
  margin: 0 0 24px;
  font-size: 28px;
  line-height: 1.2;
}

.fiveboard-export-canvas {
  position: relative;
  background: #ffffff;
  color: #111111;
  box-sizing: border-box;
}

.fiveboard-export-canvas--typed {
  --fiveboard-export-cell: 16px;
  display: grid;
  width: calc(var(--fiveboard-export-cell) * 40);
  grid-template-columns: repeat(40, var(--fiveboard-export-cell));
  grid-auto-rows: var(--fiveboard-export-cell);
}

.fiveboard-export-element,
.fiveboard-export-legacy-object {
  box-sizing: border-box;
}

.fiveboard-export-heading h1,
.fiveboard-export-heading h2,
.fiveboard-export-heading h3,
.fiveboard-export-heading h4,
.fiveboard-export-heading h5,
.fiveboard-export-heading h6,
.fiveboard-export-legacy-section h1,
.fiveboard-export-legacy-section h2,
.fiveboard-export-legacy-section h3,
.fiveboard-export-legacy-section h4,
.fiveboard-export-legacy-section h5,
.fiveboard-export-legacy-section h6 {
  margin: 0;
  line-height: 1.2;
}

.fiveboard-export-legacy-text,
.fiveboard-export-legacy-section {
  overflow: visible;
}

.fiveboard-export-legacy-code {
  margin: 0;
  padding: 8px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  color: #111827;
  font-family: Consolas, Monaco, "Courier New", monospace;
}

.fiveboard-export-legacy-image {
  display: block;
}

.fiveboard-export-legacy-rect {
  background: transparent;
}

.fiveboard-export-legacy-ellipse {
  border-radius: 9999px;
}

.fiveboard-export-unsupported,
.fiveboard-export-empty {
  padding: 8px;
  border: 1px dashed #9ca3af;
  color: #6b7280;
  background: #f9fafb;
  font: 12px/1.4 Arial, Helvetica, sans-serif;
}

@media print {
  body {
    padding: 0;
  }

  .fiveboard-export-title {
    break-after: avoid;
  }
}`;
