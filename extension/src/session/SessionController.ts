import * as vscode from 'vscode';
import {
  REACTION_KINDS,
  formatMessage,
  type ReactionKind,
  type ServerToTeacher,
  type TranslationKey,
} from '5board.vsc-common';
import { t } from '../localization';
import { InvalidServerUrlError, SessionClient, type SessionState } from './SessionClient';

const START_COMMAND = '5board-vsc.startSession';
const SERVER_URL_SETTING = '5board-vsc.server.url';

const REACTION_LABELS: Record<ReactionKind, TranslationKey> = {
  tooFast: 'extension.session.reaction.tooFast',
  tooSlow: 'extension.session.reaction.tooSlow',
  unclear: 'extension.session.reaction.unclear',
  good: 'extension.session.reaction.good',
  panic: 'extension.session.reaction.panic',
};

/**
 * What the teacher sees and does around a live session: starting and ending it, the status bar
 * item with the code, the number of students and the reactions, and the messages in between.
 * The connection itself lives in {@link SessionClient}.
 */
export class SessionController implements vscode.Disposable {
  private readonly client = new SessionClient();
  private readonly statusBarItem: vscode.StatusBarItem;
  private readonly disposables: vscode.Disposable[] = [];
  private participants = 0;
  private reactions: Record<ReactionKind, number> | null = null;

  public constructor(private readonly getServerUrl: () => string) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      '5board-vsc.session',
      vscode.StatusBarAlignment.Left,
      100,
    );
    this.statusBarItem.name = t('extension.session.statusName');
    this.statusBarItem.command = START_COMMAND;

    this.disposables.push(
      this.client.onDidChangeState(() => this.render()),
      this.client.onDidReceive((message) => this.handleMessage(message)),
      this.client.onDidEnd(() => this.handleEnd()),
    );
  }

  /** Starts a session. While one is running, offers to copy the code or to end it. */
  public async startOrManage(): Promise<void> {
    switch (this.client.state) {
      case 'idle':
        await this.start();
        return;
      case 'connecting':
        return;
      default:
        await this.manage();
    }
  }

  /** Ends the running session (does nothing without one). */
  public stop(): void {
    if (this.client.state === 'idle') return;
    this.client.stop();
    this.resetLiveData();
    void vscode.window.showInformationMessage(t('extension.session.stopped'));
  }

  public dispose(): void {
    this.client.dispose();
    this.statusBarItem.dispose();
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  private async start(): Promise<void> {
    const serverUrl = this.getServerUrl();
    this.resetLiveData();
    let code: string;
    try {
      code = await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Window, title: t('extension.session.connecting') },
        () => this.client.start(serverUrl),
      );
    } catch (error) {
      await this.showStartError(error, serverUrl);
      return;
    }

    const copy = t('extension.session.copyCode');
    const choice = await vscode.window.showInformationMessage(
      formatMessage(t('extension.session.started'), { code }),
      copy,
    );
    if (choice === copy) {
      await this.copyCode(code);
    }
  }

  private async manage(): Promise<void> {
    const code = this.client.code;
    if (!code) return;
    const choice = await vscode.window.showQuickPick(
      [
        { label: `$(copy) ${t('extension.session.copyCode')}`, action: 'copy' },
        { label: `$(debug-stop) ${t('extension.session.stop')}`, action: 'stop' },
      ],
      { title: formatMessage(t('extension.session.manageTitle'), { code }) },
    );
    if (choice?.action === 'copy') {
      await this.copyCode(code);
    } else if (choice?.action === 'stop') {
      this.stop();
    }
  }

  private async showStartError(error: unknown, serverUrl: string): Promise<void> {
    const text =
      error instanceof InvalidServerUrlError
        ? t('extension.session.invalidUrl')
        : t('extension.session.connectionFailed');
    const openSettings = t('extension.session.openSettings');
    const choice = await vscode.window.showErrorMessage(
      formatMessage(text, { url: serverUrl }),
      openSettings,
    );
    if (choice === openSettings) {
      await vscode.commands.executeCommand('workbench.action.openSettings', SERVER_URL_SETTING);
    }
  }

  private async copyCode(code: string): Promise<void> {
    await vscode.env.clipboard.writeText(code);
    vscode.window.setStatusBarMessage(t('extension.session.codeCopied'), 3000);
  }

  private handleMessage(message: ServerToTeacher): void {
    if (message.type === 'participants') {
      this.participants = message.count;
    } else if (message.type === 'reactionCounts') {
      this.reactions = message.counts;
    }
    this.render();
  }

  private handleEnd(): void {
    this.resetLiveData();
    void vscode.window.showWarningMessage(t('extension.session.sessionEnded'));
  }

  private resetLiveData(): void {
    this.participants = 0;
    this.reactions = null;
    this.render();
  }

  private render(): void {
    const state = this.client.state;
    const code = this.client.code;
    if (state === 'idle' || !code) {
      this.statusBarItem.hide();
      return;
    }
    const icon = state === 'connected' ? '$(broadcast)' : '$(sync~spin)';
    this.statusBarItem.text = `${icon} ${code} $(person) ${this.participants}`;
    this.statusBarItem.tooltip = this.buildTooltip(state);
    this.statusBarItem.show();
  }

  private buildTooltip(state: SessionState): string {
    const lines = [t('extension.session.statusName')];
    if (state === 'reconnecting') {
      lines.push(t('extension.session.reconnecting'));
    }
    lines.push(formatMessage(t('extension.session.participants'), { count: this.participants }));
    if (this.reactions) {
      for (const kind of REACTION_KINDS) {
        if (this.reactions[kind] > 0) {
          lines.push(`${t(REACTION_LABELS[kind])}: ${this.reactions[kind]}`);
        }
      }
    }
    return lines.join('\n');
  }
}
