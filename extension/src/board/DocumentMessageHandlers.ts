import vscode from 'vscode';
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
import { EXTENSION } from '../extension';
import { BoardCustomDocument } from './BoardCustomDocument';
import { ExecutionService } from '../runner/ExecutionService';
import { SRC_ROOT } from './package';

export class DocumentMessageHandlers {
  private readonly executionService = new ExecutionService();

  constructor(private readonly document: BoardCustomDocument) {}
  register(): (() => void)[] {
    return [
      //#region "General"
      this.document.messageService.on('ready', (_msg, sender) => {
        this.document.messageService.send(
          {
            type: 'init',
            document: this.document.boardPackage.document,
            editorState: EXTENSION.editorState,
            language: 'en',
          },
          sender,
        );
        // Sync whether the pointer should currently be mirrored, so the new panel starts right.
        this.document.messageService.send(
          {
            type: 'projectorStateChanged',
            active: EXTENSION.cursorTrackingEnabled && this.document.hasProjector,
            open: this.document.hasProjector,
          },
          sender,
        );
        // Sync the mirrored cursor appearance so the projector renders it correctly.
        this.document.messageService.send(
          { type: 'projectorPointerChanged', style: EXTENSION.projectorPointerStyle },
          sender,
        );
      }),
      this.document.messageService.on('focus', ({ focus }) => {
        if (focus) {
          EXTENSION.activeEditorDocument = this.document;
        } else {
          this.document.clearActiveEditorDocument();
        }
      }),

      this.document.messageService.on('selectElement', (msg) => {
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
      //#endregion "General"

      //#region "EditorTools"

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
      //#endregion "EditorTools"

      //#region "Projector"

      // The editor (ProjectorCursorMirror) only sends while mirroring is active, so just relay.
      this.document.messageService.on('cursorMove', (msg) => {
        this.document.messageService.send({ type: 'cursorMove', x: msg.x, y: msg.y });
      }),

      // When the mouse leaves the editor canvas, hide the cursor dot in the projector.
      this.document.messageService.on('cursorLeave', () => {
        this.document.messageService.send({ type: 'cursorHide' });
      }),

      // Forward scroll position from any panel to all other panels.
      // The editor only sends scroll when a projector window is open
      this.document.messageService.on('scroll', (msg) => {
        console.log(`[5board] scroll relayed to projector: top=${msg.top}, left=${msg.left}`);
        this.document.messageService.send({ type: 'scroll', top: msg.top, left: msg.left });
      }),

      this.document.messageService.on('updateViewport', (msg) => {
        this.document.messageService.send({ type: 'viewportUpdate', viewport: msg.viewport });
      }),
      //#endregion "Projector"

      this.document.messageService.on('updateBlockCode', (msg) => {
        this.updateBlockCode(msg.elementId, msg.code);
      }),
      this.document.messageService.on('openSource', (msg) => {
        this.openSource(msg.elementId);
      }),
      this.document.messageService.on('executeCodeblock', (msg) => {
        void this.executeBlock(msg.elementId);
      }),
    ];
  }

  private openSource(elementId: string): void {
    const element = this.document.boardPackage.document.content.elements.find(
      (e) => e.id === elementId,
    );
    if (!element || element.type !== EditorElementType.Code) return;

    const { className, language } = element.data as CodeElementData;
    const fileName = fileNameFromClassName(className, language);
    // The block's title bar (and thus this button) only renders once the source exists,
    // so the file is guaranteed to be present in the virtual file system.
    const uri = this.document.uri.with({
      scheme: '5board',
      path: `${this.document.uri.path}/${SRC_ROOT}/${language}/${fileName}`,
    });
    void vscode.commands.executeCommand('vscode.open', uri);
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

  public async executeBlock(elementId: string): Promise<void> {
    const result = await this.executionService.execute(
      this.document.boardPackage.document,
      elementId,
    );

    // Execution results are transient UI state — they are sent to the webviews and held
    // in local React state there, never written back into the (persisted) document.
    this.document.messageService.send({
      type: 'codeblockResult',
      elementId,
      output: {
        stdout: result.stdout,
        // Surface execution-level errors (no runner, source missing, timeout) that have
        // no stderr of their own, so the user sees them instead of an empty output.
        stderr: result.stderr || result.error || '',
        success: result.success,
        exitCode: result.exitCode,
      },
    });
  }
}
