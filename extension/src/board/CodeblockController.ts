import vscode from 'vscode';
import {
  EditorElementType,
  fileNameFromClassName,
  type CodeElementData,
  type CodeExecutionOutput,
} from '5board.vsc-common';
import { BoardCustomDocument } from './BoardCustomDocument';
import { ExecutionService } from '../runner/ExecutionService';
import { SRC_ROOT } from './package';
import { updateBlockCode } from './CodeblockSourceService';

/**
 * Per-document I/O boundary for codeblocks: wires inbound webview messages and the
 * `5board-vsc.executeCodeblock` command to the services and broadcasts results.
 */
export class CodeblockController {
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

    const output: CodeExecutionOutput = {
      stdout: result.stdout,
      // Surface execution-level failures (missing toolchain, no source) that have no stderr.
      stderr: result.stderr || result.error || '',
      success: result.success,
      exitCode: result.exitCode,
    };

    this.document.applyEdit((document) => {
      const element = document.content.elements.find((e) => e.id === elementId);
      if (element && element.type === EditorElementType.Code) {
        (element.data as CodeElementData).output = output;
      }
    });
    void this.document.saveDocument();

    this.document.messageService.send({
      type: 'codeblockResult',
      elementId,
      output,
    });
  }
}
