import vscode from 'vscode';
import { EditorElementType, fileNameFromClassName, type CodeElementData } from '5board.vsc-common';
import { BoardCustomDocument } from './BoardCustomDocument';
import { ExecutionSessionManager, type SessionEvent } from '../runner/ExecutionSessionManager';
import { SRC_ROOT } from './package';
import { resetOutput as clearStoredOutput, updateBlockCode } from './CodeblockSourceService';

/**
 * Per-document I/O boundary for codeblocks: wires inbound webview messages and the
 * `5board-vsc.executeCodeblock` command to the services and broadcasts results.
 */
export class CodeblockController {
  private readonly sessions = new ExecutionSessionManager((elementId, event) =>
    this.handleSessionEvent(elementId, event),
  );

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
      this.document.messageService.on('codeblockInput', (msg) => {
        this.sessions.input(msg.elementId, msg.text);
      }),
      this.document.messageService.on('codeblockEndInput', (msg) => {
        this.sessions.endInput(msg.elementId);
      }),
      this.document.messageService.on('codeblockStop', (msg) => {
        this.sessions.stop(msg.elementId);
      }),
      // A webview that opened or reloaded while a program was running has missed everything so
      // far, so it gets the transcript of every still-running block.
      this.document.messageService.on('ready', (_msg, sender) => {
        for (const block of this.sessions.runningBlocks()) {
          this.document.messageService.send(
            {
              type: 'codeblockSync',
              elementId: block.elementId,
              transcript: block.transcript,
              running: true,
            },
            sender,
          );
        }
      }),
      // Runs when the document is disposed, so closing an editor never leaves a process behind.
      () => this.sessions.stopAll(),
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
    await this.sessions.start(this.document.boardPackage.document, elementId);
  }

  /**
   * Clears a block's stored transcript (the "reset output" button in the element settings).
   *
   * Deliberately not routed through `updateElement`: that message neither persists nor tells
   * the webviews to drop the run they are still displaying, so the output would come back on
   * the next reload.
   */
  public resetOutput(elementId: string): void {
    // A running program still owns its transcript — clearing it now would leave the console
    // showing a fragment of a run that is still producing output.
    if (this.sessions.isRunning(elementId)) return;

    let cleared = false;
    this.document.applyEdit((document) => {
      cleared = clearStoredOutput(document, elementId);
    });
    if (!cleared) return;

    void this.document.saveDocument();
    // Editor and projector drop their live entry for the block; without this the transcript of
    // the finished run stays on screen, because live state wins over the stored one.
    this.document.messageService.send({
      type: 'codeblockSync',
      elementId,
      transcript: [],
      running: false,
    });
  }

  private handleSessionEvent(elementId: string, event: SessionEvent): void {
    switch (event.kind) {
      case 'started':
        this.document.messageService.send({ type: 'codeblockStarted', elementId });
        return;
      case 'segment':
        this.document.messageService.send({
          type: 'codeblockChunk',
          elementId,
          segment: event.segment,
        });
        return;
      case 'exited':
        this.document.messageService.send({
          type: 'codeblockExited',
          elementId,
          exitCode: event.exitCode,
          success: event.success,
          truncated: event.truncated,
        });
        // Persisted once, at the end. Every save rewrites the whole .5boardz archive, so
        // storing the transcript while it streams is not an option.
        this.storeOutput(elementId, {
          transcript: event.transcript,
          success: event.success,
          exitCode: event.exitCode,
          truncated: event.truncated,
        });
        return;
    }
  }

  private storeOutput(elementId: string, output: CodeElementData['lastOutput']): void {
    this.document.applyEdit((document) => {
      const element = document.content.elements.find((e) => e.id === elementId);
      if (!element || element.type !== EditorElementType.Code) return;
      (element.data as CodeElementData).lastOutput = output;
    });
    void this.document.saveDocument();
  }
}
