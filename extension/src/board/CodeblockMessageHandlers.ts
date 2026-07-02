import vscode from 'vscode';
import { EditorElementType, fileNameFromClassName, type CodeElementData } from '5board.vsc-common';
import { BoardCustomDocument } from './BoardCustomDocument';
import { ExecutionService } from '../runner/ExecutionService';
import { SRC_ROOT } from './package';
import { updateBlockCode } from './CodeblockService';

/** Editor-origin codeblock messages; sidebar-origin ones are handled in SidebarManager. */
export class CodeblockMessageHandlers {
  private readonly executionService = new ExecutionService();

  constructor(private readonly document: BoardCustomDocument) {}

  register(): (() => void)[] {
    return [
      this.document.messageService.on('updateBlockCode', (msg) => {
        this.document.applyEdit((document) => {
          updateBlockCode(document, msg.elementId, msg.code);
        });
        void this.document.saveDocument();
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
    // The open-file button only renders once the source exists in the virtual file system.
    const uri = this.document.uri.with({
      scheme: '5board',
      path: `${this.document.uri.path}/${SRC_ROOT}/${language}/${fileName}`,
    });
    void vscode.commands.executeCommand('vscode.open', uri);
  }

  public async executeBlock(elementId: string): Promise<void> {
    const result = await this.executionService.execute(
      this.document.boardPackage.document,
      elementId,
    );

    // Execution results are transient UI state, never written into the persisted document.
    this.document.messageService.send({
      type: 'codeblockResult',
      elementId,
      output: {
        stdout: result.stdout,
        // Fall back to execution-level errors (no runner, missing source) so they are visible.
        stderr: result.stderr || result.error || '',
        success: result.success,
        exitCode: result.exitCode,
      },
    });
  }
}
