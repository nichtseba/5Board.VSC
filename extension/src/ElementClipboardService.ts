import * as vscode from 'vscode';
import { BoardCustomDocument } from './board/BoardCustomDocument';
import { BoardPackage } from './board/package';
import { addImageAsset } from './board/addElement/addImageAsset';
import { BoardElement, EditorElement, EditorElementType } from '5board.vsc-common';

const ELEMENT_CLIPBOARD_MARKER = '5board-vsc.elements';

type ElementClipboardPayload = {
  marker: typeof ELEMENT_CLIPBOARD_MARKER;
  sourceDocumentUri: string;
  elements: BoardElement[];
};

type DocumentResolver = (uri: vscode.Uri) => BoardCustomDocument | undefined;

export class ElementClipboardService {
  public constructor(private readonly resolveDocument: DocumentResolver) {}

  public async copy(document: BoardCustomDocument): Promise<void> {
    const elements = this.getSelectedElements(document);

    if (elements.length === 0) {
      return;
    }

    const payload: ElementClipboardPayload = {
      marker: ELEMENT_CLIPBOARD_MARKER,
      sourceDocumentUri: document.uri.toString(),
      elements: structuredClone(elements),
    };
    await vscode.env.clipboard.writeText(JSON.stringify(payload));
  }

  public async paste(document: BoardCustomDocument): Promise<void> {
    const payload = this.readClipboard(await vscode.env.clipboard.readText());

    if (!payload || payload.elements.length === 0) {
      return;
    }

    try {
      const imageAssets = await this.getImageAssetsForPaste(payload, document);
      this.insertClonedElements(document, payload.elements, imageAssets);
    } catch (error) {
      void vscode.window.showErrorMessage(`Image could not be inserted: ${String(error)}`);
    }
  }

  public duplicate(document: BoardCustomDocument): void {
    const elements = this.getSelectedElements(document);

    if (elements.length === 0) {
      return;
    }

    this.insertClonedElements(document, elements);
  }

  private getSelectedElements(document: BoardCustomDocument): BoardElement[] {
    const selectedIds = new Set(document.boardPackage.document.content.selectedElementIds);
    return document.boardPackage.document.content.elements.filter((element) =>
      selectedIds.has(element.id),
    );
  }

  private readClipboard(text: string): ElementClipboardPayload | null {
    try {
      const payload: unknown = JSON.parse(text);

      if (
        typeof payload !== 'object' ||
        payload === null ||
        !('marker' in payload) ||
        payload.marker !== ELEMENT_CLIPBOARD_MARKER ||
        !('elements' in payload) ||
        !Array.isArray(payload.elements) ||
        !('sourceDocumentUri' in payload) ||
        typeof payload.sourceDocumentUri !== 'string'
      ) {
        return null;
      }

      return payload as ElementClipboardPayload;
    } catch {
      return null;
    }
  }

  private async getImageAssetsForPaste(
    payload: ElementClipboardPayload,
    targetDocument: BoardCustomDocument,
  ): Promise<Map<string, Uint8Array> | undefined> {
    if (payload.sourceDocumentUri === targetDocument.uri.toString()) {
      return undefined;
    }

    const sourceUri = vscode.Uri.parse(payload.sourceDocumentUri);
    const sourceDocument = this.resolveDocument(sourceUri)?.boardPackage.document;
    const sourcePackage = sourceDocument ?? (await BoardPackage.read(sourceUri)).document;
    const imageAssets = new Map<string, Uint8Array>();

    for (const element of payload.elements) {
      if (element.type !== EditorElementType.Image) {
        continue;
      }

      const imageElement = element as EditorElement<EditorElementType.Image>;
      const sourceAsset = sourcePackage.assets.find(
        (asset) => asset.name === imageElement.data.src,
      );
      if (!sourceAsset) {
        throw new Error(`Asset "${imageElement.data.src}" missing in the source document`);
      }
      imageAssets.set(imageElement.data.src, sourceAsset.bytes);
    }

    return imageAssets;
  }

  private insertClonedElements(
    document: BoardCustomDocument,
    elements: BoardElement[],
    imageAssets?: Map<string, Uint8Array>,
  ): void {
    const clones = structuredClone(elements).map((element) => ({
      ...element,
      id: crypto.randomUUID(),
    }));
    const cloneIds = clones.map((element) => element.id);

    document.applyEdit((boardDocument) => {
      for (const clone of clones) {
        if (clone.type !== EditorElementType.Image || !imageAssets) {
          continue;
        }

        const imageClone = clone as EditorElement<EditorElementType.Image>;
        const bytes = imageAssets.get(imageClone.data.src);
        if (!bytes) {
          continue;
        }

        imageClone.data = {
          ...imageClone.data,
          src: addImageAsset(boardDocument, imageClone.data.src, new Uint8Array(bytes)),
        };
      }
      boardDocument.content.elements.push(...clones);
      boardDocument.content.selectedElementIds = cloneIds;
      boardDocument.content.primarySelectedElementId = cloneIds[0] ?? null;
    });
  }
}
