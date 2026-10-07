import type { JSONContent } from '@tiptap/core';
import { buildSource, fileNameFromClassName, sanitizeClassName } from '../codeblock';
import { TranslationKey } from '../localization';
import { GridSettings } from '../settings';
import { Asset, BoardDocument, CodeClass, Source } from './document';
import {
  BoardElement,
  EditorElement,
  EditorElementType,
  ElementDisplay,
  ElementLayout,
  ElementStyle,
  GROUP_ELEMENT_TYPE,
  GroupElement,
  HeadingElementData,
  LineStyle,
} from './element';
import { normalizeElementRevealOrder } from './elementSections';
import { HeadingLevelSettings, HeadingSettings, getHeadingLevelSettings } from './headingSettings';
import { flattenBoardElements } from '../group';
import {
  LegacyArrowObject,
  LegacyClass,
  LegacyCodeObject,
  LegacyDocument,
  LegacyEllipseObject,
  LegacyGroupObject,
  LegacyImageObject,
  LegacyObject,
  LegacyPathObject,
  LegacyPolylineObject,
  LegacyRectObject,
  LegacySectionObject,
  LegacyTextboxObject,
  create5boardzManifest,
} from './legacy';

/**
 * Converts an old .5board document (a Fabric.js canvas with pixel coordinates) into the
 * grid based .5boardz format. The legacy canvas is scaled so its content fills the grid width.
 */
export function convertLegacyDocument(
  legacy: LegacyDocument,
  title: string,
  grid: GridSettings,
): LegacyConversionResult {
  const converter = new LegacyConverter(legacy, grid);
  return converter.convert(title);
}

export type LegacyConversionWarning = {
  key: TranslationKey;
  params?: Record<string, string>;
};

export type LegacyConversionResult = {
  document: BoardDocument;
  /** Things that could not be converted 1:1, to tell the user about. */
  warnings: LegacyConversionWarning[];
};

const LANGUAGE = 'java';
const COMMENT_PREFIX = '//';
// Legacy block markers: `//<ID=3>` ... `//</ID=3>`
const LEGACY_BLOCK_PATTERN = /\/\/[ \t]*<ID=(\d+)>[ \t]*\n([\s\S]*?)\n?[ \t]*\/\/[ \t]*<\/ID=\1>/g;
// The legacy editor's default text color; the new editor uses the theme color instead.
const DEFAULT_LEGACY_COLORS = new Set(['#000', '#000000', 'black', 'rgb(0,0,0)']);

type Box = { left: number; top: number; width: number; height: number };
type Growth = { top: number; originalBottom: number; bottom: number };
type Transform = { x: number; y: number; scaleX: number; scaleY: number };
const ROOT_TRANSFORM: Transform = { x: 0, y: 0, scaleX: 1, scaleY: 1 };

type ConvertedEntry = {
  element: BoardElement;
  revealOrder: number;
  top: number;
  left: number;
};

class LegacyConverter {
  private readonly scale: number;
  private readonly offsetTop: number;
  private readonly offsetLeft: number;
  private readonly assets: Asset[] = [];
  private readonly sources: Source[] = [];
  private readonly codeClasses: CodeClass[] = [];
  /** Deduplicated by key and parameters, so e.g. many cropped images warn once. */
  private readonly warnings = new Map<string, LegacyConversionWarning>();
  /** Legacy class name and block id → converted block code, consumed by code objects. */
  private readonly legacyBlocks = new Map<string, Map<string, string>>();
  private readonly usedBlocks = new Set<string>();
  private codeCounter = 0;
  /** Elements that got taller than their legacy box; space is made for them afterwards. */
  private readonly growths: Growth[] = [];
  /** Sections that become headings, and their titles for detecting a typed table of contents. */
  private readonly sections: LegacySectionObject[];
  private readonly sectionTitles: Set<string>;
  private tableOfContentsCreated = false;
  /** Heading styles per level, taken from the legacy sections so the sizes keep matching. */
  private readonly headingLevels: HeadingSettings['levels'];
  /** Transform of the group the object being converted belongs to. */
  private parent = ROOT_TRANSFORM;
  private imageCounter = 0;

  constructor(
    private readonly legacy: LegacyDocument,
    private readonly grid: GridSettings,
  ) {
    // Empty placeholders (e.g. the hidden root section far above the content) must not
    // influence where the board starts.
    const boxes = legacy.content.objects.filter(hasContent).map((object) => getBox(object));
    const minLeft = Math.min(0, ...boxes.map((box) => box.left));
    const maxRight = Math.max(1, ...boxes.map((box) => box.left + box.width));
    this.offsetLeft = minLeft;
    this.offsetTop = boxes.length > 0 ? Math.min(...boxes.map((box) => box.top)) : 0;
    this.scale = (grid.columnCount * grid.cellSize) / (maxRight - minLeft);
    this.sections = flattenLegacyObjects(legacy.content.objects).filter(
      (object): object is LegacySectionObject => object.type === 'section' && hasContent(object),
    );
    this.sectionTitles = new Set(
      this.sections.map((section) => normalizeTitle(section.text ?? '')),
    );
    this.headingLevels = this.getHeadingLevels();
  }

  convert(title: string): LegacyConversionResult {
    this.convertClasses(this.legacy.classes);

    const entries = this.legacy.content.objects.flatMap((object) =>
      this.convertObject(object, ROOT_TRANSFORM),
    );
    this.removeUnusedBlockMarkers();
    makeRoomForGrowths(
      entries.map((entry) => entry.element),
      this.growths,
    );
    moveToTop(entries.map((entry) => entry.element));

    const now = Date.now();
    const document: BoardDocument = {
      manifest: create5boardzManifest(title),
      content: {
        selectedElementIds: [],
        primarySelectedElementId: null,
        elements: normalizeElementRevealOrder(sortByRevealOrder(entries)),
        codeClasses: this.codeClasses,
        grid: { ...this.grid },
        background: this.legacy.content.background ?? '',
        snapAngle: 0,
        headingSettings: {
          numberingEnabled: this.legacy.content.objects.some(isNumberedSection),
          levels: this.headingLevels,
        },
      },
      sources: this.sources.map((source) => ({ ...source, createdAt: now, modifiedAt: now })),
      assets: this.assets,
    };

    return { document, warnings: [...this.warnings.values()] };
  }

  /** The most common font size and weight of the legacy sections of each level. */
  private getHeadingLevels(): HeadingSettings['levels'] {
    const sections = this.sections;
    const levels: HeadingSettings['levels'] = {};

    for (const level of new Set(sections.map(getSectionLevel))) {
      const styles = sections
        .filter((section) => getSectionLevel(section) === level && section.fontSize)
        .map((section) => ({
          fontSize: Math.round(section.fontSize! * (section.scaleY ?? 1) * this.scale),
          fontWeight: isBold(section.fontWeight) ? ('bold' as const) : ('normal' as const),
        }));
      const counts = new Map<string, number>();
      for (const style of styles) {
        const key = JSON.stringify(style);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      const [mostCommon] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? [];
      if (mostCommon) {
        levels[level] = JSON.parse(mostCommon) as HeadingLevelSettings;
      }
    }

    return levels;
  }

  /** Raises the element to the needed rows and remembers how much taller it got. */
  private growTo(element: EditorElement, neededRows: number): void {
    const { yPos, height } = element.layout;
    const rows = Math.ceil(neededRows);
    if (rows > height) {
      this.growths.push({ top: yPos, originalBottom: yPos + height, bottom: yPos + rows });
      element.layout.height = rows;
    }
  }

  private warn(key: TranslationKey, params?: Record<string, string>): void {
    this.warnings.set(`${key}${JSON.stringify(params ?? {})}`, { key, params });
  }

  //#region Code

  /**
   * Turns each legacy class into a named class source. The legacy block markers are kept as
   * placeholders until the code objects claim them (see {@link claimBlock}).
   */
  private convertClasses(classes: LegacyClass[]): void {
    for (const legacyClass of classes) {
      const className = sanitizeClassName(legacyClass.name);
      const blocks = new Map<string, string>();
      for (const match of legacyClass.code.matchAll(LEGACY_BLOCK_PATTERN)) {
        blocks.set(match[1], match[2]);
      }
      this.legacyBlocks.set(legacyClass.name, blocks);
      this.codeClasses.push({ name: className, language: LANGUAGE });
      this.sources.push({
        name: fileNameFromClassName(className, LANGUAGE),
        language: LANGUAGE,
        code: legacyClass.code,
        createdAt: 0,
        modifiedAt: 0,
      });
    }
  }

  /** Replaces the legacy markers of a block with the markers of the new code element. */
  private claimBlock(legacyClassName: string, blockId: string, elementId: string): boolean {
    const key = `${legacyClassName}#${blockId}`;
    const source = this.findClassSource(legacyClassName);
    if (
      !source ||
      this.usedBlocks.has(key) ||
      !this.legacyBlocks.get(legacyClassName)?.has(blockId)
    ) {
      return false;
    }

    this.usedBlocks.add(key);
    source.code = source.code.replace(LEGACY_BLOCK_PATTERN, (match, id: string, code: string) =>
      id === blockId
        ? `${COMMENT_PREFIX} <block id="${elementId}">\n${code}\n${COMMENT_PREFIX} </block>`
        : match,
    );
    return true;
  }

  /** Blocks no code object refers to just lose their markers; their code stays in the class. */
  private removeUnusedBlockMarkers(): void {
    for (const legacyClass of this.legacy.classes) {
      const source = this.findClassSource(legacyClass.name);
      if (source) {
        source.code = source.code.replace(
          LEGACY_BLOCK_PATTERN,
          (_match, _id, code: string) => code,
        );
      }
    }
  }

  private findClassSource(legacyClassName: string): Source | undefined {
    const fileName = fileNameFromClassName(sanitizeClassName(legacyClassName), LANGUAGE);
    return this.sources.find((source) => source.name === fileName);
  }

  private nextCodeId(): string {
    const taken = new Set(this.codeClasses.map((codeClass) => codeClass.name.toLowerCase()));
    do {
      this.codeCounter++;
    } while (taken.has(`code${this.codeCounter}`));
    return `Code${this.codeCounter}`;
  }

  //#endregion Code

  //#region Objects

  /**
   * Converts one legacy object. Children of Fabric groups are positioned relative to the
   * group's center, so `origin` is the absolute center of the parent group.
   */
  private convertObject(object: LegacyObject, parent: Transform): ConvertedEntry[] {
    const box = getBox(object);
    const absolute: Box = {
      left: parent.x + box.left * parent.scaleX,
      top: parent.y + box.top * parent.scaleY,
      width: box.width * parent.scaleX,
      height: box.height * parent.scaleY,
    };
    // Fabric does not render invisible objects at all, so they are not converted either.
    if (object.visible === false) {
      return [];
    }
    const previousParent = this.parent;
    this.parent = parent;
    const element = this.convertElement(object, absolute);
    this.parent = previousParent;
    if (!element) {
      return [];
    }

    return [
      {
        element,
        revealOrder: object.revealOrder ?? Number.POSITIVE_INFINITY,
        top: absolute.top,
        left: absolute.left,
      },
    ];
  }

  private convertElement(object: LegacyObject, box: Box): BoardElement | undefined {
    switch (object.type) {
      case 'textbox':
        return this.convertTextbox(object, box);
      case 'section':
        return this.convertSection(object, box);
      case 'code':
        return this.convertCode(object, box);
      case 'image':
        return this.convertImage(object, box);
      case 'rect':
        return this.convertShape(object, box, EditorElementType.Rectangle);
      case 'ellipse':
        return this.convertShape(object, box, EditorElementType.Circle);
      case 'arrow':
        return this.convertArrow(object, box);
      case 'path':
        return this.convertPath(object, box);
      case 'polyline':
        return this.convertPolyline(object, box);
      case 'group':
        return this.convertGroup(object, box);
      default:
        this.warn('extension.legacyImport.warnings.unknownType', {
          type: (object as { type: string }).type,
        });
        return undefined;
    }
  }

  private convertGroup(object: LegacyGroupObject, box: Box): BoardElement | undefined {
    // Children are stored relative to the group's center and scaled with the group.
    const transform: Transform = {
      x: box.left + box.width / 2,
      y: box.top + box.height / 2,
      scaleX: this.parent.scaleX * (object.scaleX ?? 1),
      scaleY: this.parent.scaleY * (object.scaleY ?? 1),
    };
    const children = sortByRevealOrder(
      (object.objects ?? []).flatMap((child) => this.convertObject(child, transform)),
    );
    if (children.length === 0) {
      return undefined;
    }
    if (children.length === 1) {
      return children[0];
    }

    const group: GroupElement = {
      id: crypto.randomUUID(),
      type: GROUP_ELEMENT_TYPE,
      data: { children },
    };
    if (object.displayName) {
      group.name = object.displayName;
    }
    return group;
  }

  private convertTextbox(object: LegacyTextboxObject, box: Box): EditorElement | undefined {
    if (!object.text?.trim()) {
      return undefined;
    }

    if (!this.tableOfContentsCreated && this.isTableOfContents(object)) {
      return this.convertTableOfContents(object, box);
    }

    const content = this.convertText(object);
    const element = this.createElement(EditorElementType.Text, object, box, { content });
    // Fabric's height is the wrapped text at Fabric's line height. Box width and font scale
    // together, so the text wraps the same way; only the taller line height needs more rows.
    const lineHeightRatio = TEXT_LINE_HEIGHT / (object.lineHeight || FABRIC_LINE_HEIGHT);
    this.growTo(
      element,
      (box.height * this.scale * lineHeightRatio * TEXT_SAFETY) / this.grid.cellSize,
    );
    return element;
  }

  /**
   * Legacy boards had no table of contents element; it was typed into a textbox. A textbox
   * whose lines are mostly section titles becomes a real, self-updating table of contents.
   */
  private isTableOfContents(object: LegacyTextboxObject): boolean {
    const lines = getTextLines(object.text ?? '');
    const titleLines = lines.filter((line) => this.sectionTitles.has(stripNumbering(line)));
    return (
      titleLines.length >= MIN_TABLE_OF_CONTENTS_ENTRIES &&
      titleLines.length >= lines.length * MIN_TABLE_OF_CONTENTS_SHARE
    );
  }

  private convertTableOfContents(object: LegacyTextboxObject, box: Box): EditorElement {
    this.tableOfContentsCreated = true;
    const fontSize = Number.parseFloat(
      this.scaleFontSize(object.fontSize, object.scaleY ?? 1) ?? '',
    );
    const element = this.createElement(EditorElementType.TableOfContents, object, box, {
      fontSize: Number.isFinite(fontSize) ? fontSize : undefined,
    });

    const lines = getTextLines(object.text ?? '');
    const dropped = lines.filter((line) => !this.sectionTitles.has(stripNumbering(line)));
    if (dropped.length > 0) {
      this.warn('extension.legacyImport.warnings.tableOfContentsLines', {
        lines: dropped.join(', '),
      });
    }

    // The element lists every heading and does not grow by itself, so it needs its full height.
    const entryFontSize = Number.isFinite(fontSize)
      ? fontSize
      : DEFAULT_TABLE_OF_CONTENTS_FONT_SIZE;
    const widthPx = element.layout.width * this.grid.cellSize;
    const heightPx = this.sections.reduce((sum, section) => {
      const level = getSectionLevel(section);
      const text = `${section.numbering ?? ''}${section.text?.trim() ?? ''}`;
      const availableWidth = Math.max(1, widthPx - (level - 1) * TABLE_OF_CONTENTS_INDENT);
      const lines = Math.ceil((text.length * entryFontSize * AVERAGE_CHAR_WIDTH) / availableWidth);
      return sum + Math.max(1, lines) * entryFontSize * TEXT_LINE_HEIGHT + TABLE_OF_CONTENTS_GAP;
    }, 0);
    this.growTo(element, heightPx / this.grid.cellSize);
    return element;
  }

  private convertSection(object: LegacySectionObject, box: Box): EditorElement | undefined {
    const content = object.text?.trim();
    if (!content) {
      return undefined;
    }

    const level = getSectionLevel(object);
    const element = this.createElement(EditorElementType.Heading, object, box, { level, content });
    // The editor grows headings to their text, including the generated number in front.
    const { fontSize = DEFAULT_HEADING_FONT_SIZE, fontWeight } = getHeadingLevelSettings(
      { levels: this.headingLevels },
      level,
    );
    const charWidth = fontSize * (isBold(fontWeight) ? BOLD_CHAR_WIDTH : AVERAGE_CHAR_WIDTH);
    const textWidth = `${object.numbering ?? ''}${content}`.length * charWidth;
    const lines = Math.max(1, Math.ceil(textWidth / (element.layout.width * this.grid.cellSize)));
    this.growTo(element, (lines * fontSize * headingLineHeight(level)) / this.grid.cellSize);
    return element;
  }

  private convertCode(object: LegacyCodeObject, box: Box): EditorElement {
    const id = this.nextCodeId();
    // Standalone blocks are stored with the class name "null".
    const legacyClassName =
      object.codeClass && object.codeClass !== 'null' ? object.codeClass : undefined;
    const blockId = object.codeClassBlockId?.toString();

    let className = sanitizeClassName(id);
    if (legacyClassName && blockId && this.claimBlock(legacyClassName, blockId, id)) {
      className = sanitizeClassName(legacyClassName);
    } else {
      // No (unclaimed) block in a class: the element becomes a standalone runnable block.
      if (legacyClassName) {
        this.warn('extension.legacyImport.warnings.missingCodeBlock', {
          block: blockId ?? '?',
          className: legacyClassName,
        });
      }
      this.sources.push({
        name: fileNameFromClassName(className, LANGUAGE),
        language: LANGUAGE,
        code: buildSource({
          elementId: id,
          className,
          language: LANGUAGE,
          code: object.text ?? '',
          mainWrap: true,
        }),
        createdAt: 0,
        modifiedAt: 0,
      });
    }

    const element = this.createElement(EditorElementType.Code, object, box, {
      className,
      language: LANGUAGE,
    });
    // The code editor is as tall as its lines, plus padding and the run bar below it.
    const lines = (object.text ?? '').split('\n').length;
    this.growTo(element, (lines * CODE_LINE_HEIGHT + CODE_CHROME_HEIGHT) / this.grid.cellSize);
    element.id = id;
    return element;
  }

  private convertImage(object: LegacyImageObject, box: Box): EditorElement | undefined {
    const decoded = object.src ? decodeDataUrl(object.src) : undefined;
    if (!decoded) {
      this.warn('extension.legacyImport.warnings.imageWithoutData');
      return undefined;
    }

    this.imageCounter++;
    const name = `image${String(this.imageCounter).padStart(3, '0')}.${decoded.extension}`;
    const now = Date.now();
    this.assets.push({
      name,
      mime: decoded.mime,
      bytes: decoded.bytes,
      createdAt: now,
      modifiedAt: now,
    });

    if (object.cropX || object.cropY) {
      this.warn('extension.legacyImport.warnings.imageCrop');
    }

    return this.createElement(EditorElementType.Image, object, box, {
      src: name,
      content: '',
      altText: object.altText || 'Image',
      hideInExport: object.hideInExport || undefined,
      configuredWidth: true,
      aspectRatio: box.width > 0 && box.height > 0 ? box.width / box.height : undefined,
    });
  }

  private convertShape(
    object: LegacyRectObject | LegacyEllipseObject,
    box: Box,
    type: EditorElementType.Rectangle | EditorElementType.Circle,
  ): EditorElement {
    const element = this.createElement(type, object, box, undefined);
    element.style = {
      ...element.style,
      backgroundColor: toColor(object.fill) ?? 'transparent',
      border: {
        color: toColor(object.stroke) ?? 'var(--vscode-foreground)',
        width: this.scaleStroke(object.strokeWidth),
        ...(type === EditorElementType.Rectangle && object.rx
          ? { radius: Math.round(object.rx * this.scale) }
          : {}),
      },
    };
    return element;
  }

  private convertArrow(object: LegacyArrowObject, box: Box): EditorElement {
    const { width, height } = box;
    const toPercent = (value: number | undefined, size: number) =>
      size > 0 ? ((value ?? 0) / size + 0.5) * 100 : 50;
    const arrowHead = object.arrowHead ?? 'line';

    const element = this.createElement(EditorElementType.Line, object, box, {
      points: [
        { x: toPercent(object.x1, width), y: toPercent(object.y1, height) },
        { x: toPercent(object.x2, width), y: toPercent(object.y2, height) },
      ],
      headTypeEnd: arrowHead === 'none' ? 'none' : 'arrow',
      headFill: arrowHead !== 'line',
    });
    element.style = { ...element.style, border: this.lineBorder(object, object.strokeDash) };
    return element;
  }

  private convertPath(object: LegacyPathObject, box: Box): EditorElement | undefined {
    const points = pathToPoints(object.path ?? []);
    if (points.length < 2) {
      return undefined;
    }

    // A single straight segment is a line, which stays editable as such.
    if (points.length === 2) {
      const bounds = getBounds(points);
      const toPercent = (value: number, min: number, size: number) =>
        size > 0 ? ((value - min) / size) * 100 : 50;
      const element = this.createElement(EditorElementType.Line, object, box, {
        points: points.map((point) => ({
          x: toPercent(point.x, bounds.minX, bounds.width),
          y: toPercent(point.y, bounds.minY, bounds.height),
        })),
      });
      element.style = { ...element.style, border: this.lineBorder(object, object.strokeDash) };
      return element;
    }

    return this.createFreehand(object, box, points, false, object.strokeDash);
  }

  private convertPolyline(object: LegacyPolylineObject, box: Box): EditorElement | undefined {
    const points = (object.points ?? []).filter(isPoint);
    if (points.length < 2) {
      return undefined;
    }
    return this.createFreehand(object, box, points, true, undefined);
  }

  private createFreehand(
    object: LegacyObject,
    box: Box,
    points: Point[],
    straight: boolean,
    strokeDash: string | undefined,
  ): EditorElement {
    const bounds = getBounds(points);
    const normalize = (value: number, min: number, size: number) =>
      size > 0 ? (value - min) / size : 0.5;

    return this.createElement(EditorElementType.Freehand, object, box, {
      strokes: [
        {
          points: points.map((point) => ({
            x: normalize(point.x, bounds.minX, bounds.width),
            y: normalize(point.y, bounds.minY, bounds.height),
          })),
          color: toColor(object.stroke),
          width: this.scaleStroke(object.strokeWidth),
          lineStyle: toLineStyle(strokeDash),
          straight: straight || undefined,
        },
      ],
    });
  }

  private lineBorder(object: LegacyObject, strokeDash: string | undefined): ElementStyle['border'] {
    return {
      color: toColor(object.stroke) ?? 'var(--vscode-foreground)',
      width: this.scaleStroke(object.strokeWidth),
      style: toLineStyle(strokeDash),
    };
  }

  private createElement<T extends EditorElementType>(
    type: T,
    object: LegacyObject,
    box: Box,
    data: EditorElement<T>['data'],
  ): EditorElement<T> {
    const element: EditorElement<T> = {
      id: crypto.randomUUID(),
      type,
      layout: this.toLayout(box),
      style: {
        visible: true,
        ...(object.opacity !== undefined && object.opacity < 1 ? { opacity: object.opacity } : {}),
      },
      display: toDisplay(object),
      data,
    };
    const displayName = 'displayName' in object ? object.displayName : undefined;
    if (displayName && type !== EditorElementType.Heading) {
      element.name = displayName;
    }
    if (object.angle) {
      element.layout.rotation = object.angle;
    }
    return element;
  }

  //#endregion Objects

  //#region Units

  private toLayout(box: Box): ElementLayout {
    const cell = this.grid.cellSize;
    const toCells = (pixels: number) => (pixels * this.scale) / cell;
    const xPos = Math.max(0, Math.round(toCells(box.left - this.offsetLeft)));
    const yPos = Math.max(0, Math.round(toCells(box.top - this.offsetTop)));

    return {
      xPos: Math.min(xPos, this.grid.columnCount - 1),
      yPos,
      width: Math.max(1, Math.min(this.grid.columnCount - xPos, Math.round(toCells(box.width)))),
      height: Math.max(1, Math.round(toCells(box.height))),
    };
  }

  /** Font sizes scale with the text object and its groups, like they do in Fabric. */
  private scaleFontSize(size: number | undefined, objectScale: number): string | undefined {
    const factor = objectScale * this.parent.scaleY * this.scale;
    return size ? `${Math.max(6, Math.round(size * factor))}px` : undefined;
  }

  private scaleStroke(width: number | undefined): number {
    return Math.max(1, Math.round((width ?? 1) * this.scale));
  }

  //#endregion Units

  //#region Text

  /** Converts Fabric text with per-character styles into a Tiptap document. */
  private convertText(object: LegacyTextboxObject): JSONContent {
    const base: CharStyle = {
      bold: isBold(object.fontWeight),
      italic: object.fontStyle === 'italic',
      underline: !!object.underline,
      strike: !!object.linethrough,
      color: toTextColor(object.fill),
      fontSize: this.scaleFontSize(object.fontSize, object.scaleY ?? 1),
      fontFamily: isMonospace(object.fontFamily) ? 'monospace' : undefined,
    };
    const styles = (object.styles ?? {}) as Record<string, Record<string, LegacyCharStyle>>;

    const paragraphs = (object.text ?? '').split('\n').map((line, lineIndex) => {
      const lineStyles = styles[lineIndex] ?? {};
      const nodes: JSONContent[] = [];
      let text = '';
      let current: CharStyle | undefined;

      Array.from(line).forEach((char, charIndex) => {
        const style = this.mergeCharStyle(base, lineStyles[charIndex], object.scaleY ?? 1);
        if (current && sameCharStyle(current, style)) {
          text += char;
          return;
        }
        if (current && text) {
          nodes.push(textNode(text, current));
        }
        text = char;
        current = style;
      });
      if (current && text) {
        nodes.push(textNode(text, current));
      }

      return nodes.length > 0 ? { type: 'paragraph', content: nodes } : { type: 'paragraph' };
    });

    return { type: 'doc', content: paragraphs };
  }

  private mergeCharStyle(
    base: CharStyle,
    style: LegacyCharStyle | undefined,
    objectScale: number,
  ): CharStyle {
    if (!style) {
      return base;
    }
    return {
      bold: style.fontWeight !== undefined ? isBold(style.fontWeight) : base.bold,
      italic: style.fontStyle !== undefined ? style.fontStyle === 'italic' : base.italic,
      underline: style.underline ?? base.underline,
      strike: style.linethrough ?? base.strike,
      color: style.fill !== undefined ? toTextColor(style.fill) : base.color,
      fontSize:
        style.fontSize !== undefined
          ? this.scaleFontSize(style.fontSize, objectScale)
          : base.fontSize,
      fontFamily:
        style.fontFamily !== undefined
          ? isMonospace(style.fontFamily)
            ? 'monospace'
            : undefined
          : base.fontFamily,
    };
  }

  //#endregion Text
}

type Point = { x: number; y: number };

type LegacyCharStyle = {
  fontWeight?: string | number;
  fontStyle?: string;
  underline?: boolean;
  linethrough?: boolean;
  fill?: unknown;
  fontSize?: number;
  fontFamily?: string;
};

type CharStyle = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  color?: string;
  fontSize?: string;
  fontFamily?: string;
};

function textNode(text: string, style: CharStyle): JSONContent {
  const marks: JSONContent['marks'] = [];
  if (style.bold) marks.push({ type: 'bold' });
  if (style.italic) marks.push({ type: 'italic' });
  if (style.underline) marks.push({ type: 'underline' });
  if (style.strike) marks.push({ type: 'strike' });

  const attrs = Object.fromEntries(
    Object.entries({
      color: style.color,
      fontSize: style.fontSize,
      fontFamily: style.fontFamily,
    }).filter(([, value]) => value !== undefined),
  );
  if (Object.keys(attrs).length > 0) {
    marks.push({ type: 'textStyle', attrs });
  }

  return marks.length > 0 ? { type: 'text', text, marks } : { type: 'text', text };
}

function sameCharStyle(a: CharStyle, b: CharStyle): boolean {
  return (
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.strike === b.strike &&
    a.color === b.color &&
    a.fontSize === b.fontSize &&
    a.fontFamily === b.fontFamily
  );
}

function isBold(weight: string | number | undefined): boolean {
  if (typeof weight === 'number') return weight >= 600;
  return weight === 'bold' || weight === 'bolder' || Number(weight) >= 600;
}

function isMonospace(fontFamily: string | undefined): boolean {
  return !!fontFamily && /consolas|monaco|courier|mono/i.test(fontFamily);
}

function toColor(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value || value === 'transparent') {
    return undefined;
  }
  return DEFAULT_LEGACY_COLORS.has(value.replace(/\s/g, '').toLowerCase()) ? undefined : value;
}

/** Text keeps every color except the legacy default black, which becomes the theme color. */
function toTextColor(value: unknown): string | undefined {
  return toColor(value);
}

function toLineStyle(strokeDash: string | undefined): LineStyle | undefined {
  if (!strokeDash || strokeDash === 'solid' || strokeDash === 'none') {
    return undefined;
  }
  return strokeDash.includes('dot') ? 'dotted' : 'dashed';
}

function toDisplay(object: LegacyObject): ElementDisplay {
  return {
    visible: true,
    speakerNote: 'isSpeakerNote' in object && !!object.isSpeakerNote,
    excludeFromExport: false,
  };
}

function getBox(object: LegacyObject): Box {
  return {
    left: object.left ?? 0,
    top: object.top ?? 0,
    width: (object.width ?? 0) * (object.scaleX ?? 1),
    height: (object.height ?? 0) * (object.scaleY ?? 1),
  };
}

function getBounds(points: Point[]) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { minX, minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}

function isPoint(value: unknown): value is Point {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Point).x === 'number' &&
    typeof (value as Point).y === 'number'
  );
}

/** Samples the points of a Fabric path (M, L, Q, C commands; curves are subdivided). */
function pathToPoints(path: Array<unknown>): Point[] {
  const points: Point[] = [];
  let current: Point = { x: 0, y: 0 };
  const CURVE_STEPS = 8;

  for (const command of path) {
    if (!Array.isArray(command) || typeof command[0] !== 'string') continue;
    const [op, ...raw] = command as [string, ...number[]];
    const args = raw.map(Number);

    switch (op.toUpperCase()) {
      case 'M':
      case 'L':
        current = { x: args[0], y: args[1] };
        points.push(current);
        break;
      case 'Q': {
        const start = current;
        for (let step = 1; step <= CURVE_STEPS; step++) {
          const t = step / CURVE_STEPS;
          const mt = 1 - t;
          points.push({
            x: mt * mt * start.x + 2 * mt * t * args[0] + t * t * args[2],
            y: mt * mt * start.y + 2 * mt * t * args[1] + t * t * args[3],
          });
        }
        current = { x: args[2], y: args[3] };
        break;
      }
      case 'C': {
        const start = current;
        for (let step = 1; step <= CURVE_STEPS; step++) {
          const t = step / CURVE_STEPS;
          const mt = 1 - t;
          points.push({
            x:
              mt ** 3 * start.x +
              3 * mt * mt * t * args[0] +
              3 * mt * t * t * args[2] +
              t ** 3 * args[4],
            y:
              mt ** 3 * start.y +
              3 * mt * mt * t * args[1] +
              3 * mt * t * t * args[3] +
              t ** 3 * args[5],
          });
        }
        current = { x: args[4], y: args[5] };
        break;
      }
    }
  }

  return points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
}

/** Sorts by the legacy reveal order; objects without one follow in canvas order. */
function sortByRevealOrder(entries: ConvertedEntry[]): BoardElement[] {
  return [...entries]
    .sort((a, b) => a.revealOrder - b.revealOrder || a.top - b.top || a.left - b.left)
    .map((entry) => entry.element);
}

function hasContent(object: LegacyObject): boolean {
  if (object.visible === false) {
    return false;
  }
  switch (object.type) {
    case 'textbox':
    case 'section':
      return !!object.text?.trim();
    case 'group':
      return (object.objects ?? []).some(hasContent);
    default:
      return true;
  }
}

// Matches the editor's text rendering: no paragraph margins and a line height of 1.5.
const TEXT_LINE_HEIGHT = 1.5;
// Average glyph width relative to the font size, used to estimate where headings wrap.
const AVERAGE_CHAR_WIDTH = 0.55;
const DEFAULT_HEADING_FONT_SIZE = 16;
const BOLD_CHAR_WIDTH = 0.6;

/** Line heights of the heading levels in the editor (leading-tight/snug/normal). */
function headingLineHeight(level: HeadingElementData['level']): number {
  return level <= 2 ? 1.25 : level <= 4 ? 1.375 : 1.5;
}

// A typed table of contents lists at least this many titles, and mostly titles.
const MIN_TABLE_OF_CONTENTS_ENTRIES = 3;
const MIN_TABLE_OF_CONTENTS_SHARE = 0.6;
// Matches TableOfContentsElement: default size, indent per level and gap between entries.
const DEFAULT_TABLE_OF_CONTENTS_FONT_SIZE = 14;
const TABLE_OF_CONTENTS_INDENT = 20;
const TABLE_OF_CONTENTS_GAP = 4;

function getTextLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** Removes a typed number like "1.3.2" or "1.3.2." in front of a title. */
function stripNumbering(line: string): string {
  return normalizeTitle(line.replace(/^\d+(\.\d+)*\.?\s+/, ''));
}

function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ').toLowerCase();
}

function getSectionLevel(object: LegacySectionObject): HeadingElementData['level'] {
  const level = Number.parseInt(object.sectionLevel ?? '1', 10) || 1;
  return Math.min(6, Math.max(1, level)) as HeadingElementData['level'];
}

function flattenLegacyObjects(objects: LegacyObject[]): LegacyObject[] {
  return objects.flatMap((object) =>
    object.type === 'group' ? [object, ...flattenLegacyObjects(object.objects ?? [])] : [object],
  );
}

// Fabric's default line height for text objects.
const FABRIC_LINE_HEIGHT = 1.16;
// Room for fonts that are a bit wider than the legacy font and wrap one line earlier.
const TEXT_SAFETY = 1.1;
// Monaco at its default font size, plus its vertical padding, the run bar and the border.
const CODE_LINE_HEIGHT = 19;
const CODE_CHROME_HEIGHT = 16 + 36 + 2;

/**
 * Elements that grew would cover what was below them. Like the spacer tool, this inserts
 * rows below each grown element and moves everything starting there down, which keeps
 * side-by-side layouts intact. Rows already inserted for a neighbour are reused.
 */
function makeRoomForGrowths(elements: BoardElement[], growths: Growth[]): void {
  const insertions: { row: number; rows: number }[] = [];
  const shiftAt = (row: number) =>
    insertions.reduce((sum, insertion) => (insertion.row <= row ? sum + insertion.rows : sum), 0);

  for (const growth of [...growths].sort((a, b) => a.originalBottom - b.originalBottom)) {
    const grownBottom = growth.bottom + shiftAt(growth.top);
    const nextFreeRow = growth.originalBottom + shiftAt(growth.originalBottom);
    const missingRows = grownBottom - nextFreeRow;
    if (missingRows > 0) {
      insertions.push({ row: growth.originalBottom, rows: missingRows });
    }
  }

  for (const element of elements) {
    const leaves = flattenBoardElements([element]);
    const shift = shiftAt(Math.min(...leaves.map((leaf) => leaf.layout.yPos)));
    leaves.forEach((leaf) => (leaf.layout.yPos += shift));
  }
}

/** Removes empty rows above the first element. */
function moveToTop(elements: BoardElement[]): void {
  const leaves = flattenBoardElements(elements);
  const top = Math.min(...leaves.map((leaf) => leaf.layout.yPos));
  if (Number.isFinite(top) && top > 0) {
    leaves.forEach((leaf) => (leaf.layout.yPos -= top));
  }
}
function isNumberedSection(object: LegacyObject): boolean {
  return object.type === 'section' && !!object.numbering?.trim();
}

/** Decodes a base64 data URL into bytes and a file extension. */
function decodeDataUrl(
  dataUrl: string,
): { bytes: Uint8Array; mime: string; extension: string } | undefined {
  const match = /^data:([^;,]*)(;[^,]*)?,(.*)$/s.exec(dataUrl);
  if (!match || !match[2]?.includes('base64')) {
    return undefined;
  }

  const binary = atob(match[3]);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  // Some legacy images only declare "image" without a subtype.
  const mime = match[1].includes('/') ? match[1] : detectImageMime(bytes);
  const extension =
    { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/svg+xml': 'svg' }[mime] ?? mime.split('/')[1];
  return { bytes, mime, extension };
}

function detectImageMime(bytes: Uint8Array): string {
  const startsWith = (...prefix: number[]) => prefix.every((byte, index) => bytes[index] === byte);
  if (startsWith(0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (startsWith(0x47, 0x49, 0x46)) return 'image/gif';
  if (startsWith(0x52, 0x49, 0x46, 0x46)) return 'image/webp';
  if (startsWith(0x3c)) return 'image/svg+xml';
  return 'image/png';
}
