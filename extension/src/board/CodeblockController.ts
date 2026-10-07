import vscode from 'vscode';
import { fileNameFromClassName, type BoardDocument } from '5board.vsc-common';
import { BoardCustomDocument } from './BoardCustomDocument';
import { ExecutionSessionManager, type SessionEvent } from '../runner/ExecutionSessionManager';
import { SRC_ROOT } from './package';
import { findCodeElement, updateBlockCode } from './CodeblockSourceService';
import {
  hasStoredOutputs,
  resetAllOutputs,
  resetOutput,
  setLastOutput,
  setOutputCollapsed,
} from './CodeblockOutputService';

/**
 * Per-document I/O boundary for codeblocks: wires inbound webview messages and the codeblock
 * commands to the services and broadcasts results.
 */
export class CodeblockController {
  private readonly sessions = new ExecutionSessionManager((elementId, event) =>
    this.handleSessionEvent(elementId, event),
  );
  // Kept for webviews that open mid-run.
  private readonly inputDrafts = new Map<string, string>();

  constructor(private readonly document: BoardCustomDocument) {}

  register(): (() => void)[] {
    const messages = this.document.messageService;
    return [
      messages.on('updateBlockCode', (msg) => {
        this.document.applyEdit((document) =>
          updateBlockCode(document, msg.elementId, msg.code) ? document : null,
        );
      }),
      messages.on('openSource', (msg) => this.openSource(msg.elementId)),
      messages.on('executeCodeblock', (msg) => void this.executeBlock(msg.elementId)),
      messages.on('codeblockInput', (msg) => this.sessions.input(msg.elementId, msg.text)),
      messages.on('codeblockInputDraft', (msg) => {
        if (!this.sessions.isRunning(msg.elementId)) return;
        this.inputDrafts.set(msg.elementId, msg.text);
        messages.send(msg);
      }),
      messages.on('codeblockEndInput', (msg) => this.sessions.endInput(msg.elementId)),
      messages.on('codeblockStop', (msg) => this.sessions.stop(msg.elementId)),
      messages.on('codeblockSetOutputCollapsed', (msg) => {
        this.editDocument((document) => setOutputCollapsed(document, msg.elementId, msg.collapsed));
      }),
      // A webview that opened or reloaded mid-run catches up on every still-running block.
      messages.on('ready', (_msg, sender) => {
        for (const block of this.sessions.runningBlocks()) {
          messages.send(
            {
              type: 'codeblockSync',
              elementId: block.elementId,
              transcript: block.transcript,
              running: true,
              draft: this.inputDrafts.get(block.elementId),
            },
            sender,
          );
        }
      }),
      () => this.sessions.stopAll(),
    ];
  }

  public async executeBlock(elementId: string): Promise<void> {
    await this.sessions.start(this.document.boardPackage.document, elementId);
  }

  /** Returns whether there was anything to reset, so the caller can say so otherwise. */
  public resetOutput(elementId: string): boolean {
    const stored = this.editDocument((document) => resetOutput(document, elementId));
    if (!stored && !this.sessions.isActive(elementId)) return false;
    this.clearShownOutputs([elementId]);
    return true;
  }

  public resetAllOutputs(): void {
    let stored: string[] = [];
    this.editDocument((document) => {
      stored = resetAllOutputs(document);
      return stored.length > 0;
    });
    this.clearShownOutputs([...new Set([...stored, ...this.sessions.activeBlockIds()])]);
  }

  /** Stored or live: a running block counts even before its first run has stored anything. */
  public hasOutputs(): boolean {
    return (
      hasStoredOutputs(this.document.boardPackage.document) ||
      this.sessions.activeBlockIds().length > 0
    );
  }

  private openSource(elementId: string): void {
    const element = findCodeElement(this.document.boardPackage.document, elementId);
    if (!element) return;

    const { className, language } = element.data;
    const uri = this.document.uri.with({
      scheme: '5board',
      path: `${this.document.uri.path}/${SRC_ROOT}/${language}/${fileNameFromClassName(className, language)}`,
    });
    void vscode.commands.executeCommand('vscode.open', uri);
  }

  // Live state wins over the stored one in the webviews, so they have to drop it explicitly.
  private clearShownOutputs(elementIds: string[]): void {
    for (const elementId of elementIds) {
      if (this.sessions.isActive(elementId)) {
        this.clearRunningOutput(elementId);
      } else {
        this.document.messageService.send({ type: 'codeblockOutputCleared', elementId });
      }
    }
  }

  /**
   * The one place that decides what a reset does to a running block: empty the console and let
   * the program keep running, so its exit stores only what came after the reset.
   *
   * To stop the program instead, it has to be dropped without reporting its exit (like a restart
   * does), not via `stop()`: the exit would arrive afterwards and store the transcript again.
   */
  private clearRunningOutput(elementId: string): void {
    this.sessions.clearTranscript(elementId);
    this.document.messageService.send({ type: 'codeblockTranscriptCleared', elementId });
  }

  private editDocument(edit: (document: BoardDocument) => boolean): boolean {
    let changed = false;
    this.document.applyEdit((document) => {
      changed = edit(document);
      return changed ? document : null;
    });
    return changed;
  }

  private handleSessionEvent(elementId: string, event: SessionEvent): void {
    const messages = this.document.messageService;
    switch (event.kind) {
      case 'started':
        this.inputDrafts.delete(elementId);
        messages.send({ type: 'codeblockStarted', elementId });
        this.editDocument((document) => setOutputCollapsed(document, elementId, false));
        return;
      case 'segment':
        messages.send({ type: 'codeblockChunk', elementId, segment: event.segment });
        return;
      case 'exited':
        this.inputDrafts.delete(elementId);
        messages.send({
          type: 'codeblockExited',
          elementId,
          exitCode: event.exitCode,
          success: event.success,
          truncated: event.truncated,
        });
        this.editDocument((document) =>
          setLastOutput(document, elementId, {
            transcript: event.transcript,
            success: event.success,
            exitCode: event.exitCode,
            truncated: event.truncated,
          }),
        );
        return;
    }
  }
}
