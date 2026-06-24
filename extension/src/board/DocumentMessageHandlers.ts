import {
  EditorElementType,
  fileNameFromClassName,
  buildSource,
  isDefaultClassName,
  COMMENT_PREFIX_BY_LANGUAGE,
  updateBlock,
  getBlockIndent,
  indentCode,
  type CodeElementData,
} from '5board.vsc-common';
import { BoardCustomDocument } from './BoardCustomDocument';

export class DocumentMessageHandlers {
  constructor(private readonly document: BoardCustomDocument) {}

  register(): (() => void)[] {
    return [
      this.document.messageService.on('selectElement', (msg) => {
        console.log('selectElement: ', msg.id);
        this.document.applyEdit((document) => {
          document.content.selectedElementId = msg.id;
        });
      }),
      this.document.messageService.on('updateElementLayout', (msg) => {
        this.document.applyEdit((document) => {
          const element = document.content.elements.find((e) => e.id === msg.id);

          if (!element) {
            return;
          }

          element.layout = {
            ...element.layout,
            ...msg.changes,
          };
        });
      }),
      this.document.messageService.on('insertSpacerRows', (msg) => {
        this.document.applyEdit((document) => {
          for (const element of document.content.elements) {
            if (element.layout.yPos >= msg.startRow) {
              element.layout = {
                ...element.layout,
                yPos: element.layout.yPos + msg.rowCount,
              };
            }
          }
        });
      }),
      this.document.messageService.on('updateBlockCode', (msg) => {
        this.updateBlockCode(msg.elementId, msg.code);
      }),
    ];
  }

  private updateBlockCode(elementId: string, code: string): void {
    const doc = this.document.boardPackage.document;
    const element = doc.content.elements.find((e) => e.id === elementId);
    if (!element || element.type !== EditorElementType.Code) return;

    const { className, language } = element.data as CodeElementData;
    const fileName = fileNameFromClassName(className, language);
    const prefix = COMMENT_PREFIX_BY_LANGUAGE[language] ?? '//';

    this.document.applyEdit((document) => {
      const source = document.sources.find((s) => s.name === fileName && s.language === language);

      if (source) {
        const indent = getBlockIndent(source.code, elementId, prefix);
        const reindented = indentCode(code, indent);
        source.code = updateBlock(source.code, elementId, reindented, prefix);
        source.modifiedAt = Date.now();
      } else {
        const mainWrap = isDefaultClassName(className, elementId);
        const newSource = buildSource({
          elementId,
          className,
          language,
          code,
          mainWrap,
        });
        document.sources.push({
          name: fileName,
          language,
          code: newSource,
          createdAt: Date.now(),
          modifiedAt: Date.now(),
        });
      }
    });

    void this.document.saveDocument();
  }
}
