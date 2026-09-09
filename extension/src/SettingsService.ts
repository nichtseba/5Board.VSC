import * as vscode from 'vscode';

export interface JavaSettings {
  compilerPath: string;
  runtimePath: string;
}

export interface PresetSettings {
  directoryPath: string;
}

export interface FiveBoardSettings {
  java: JavaSettings;
  presets: PresetSettings;
}

export class SettingsService implements vscode.Disposable {
  private readonly changeEmitter = new vscode.EventEmitter<FiveBoardSettings>();

  public readonly onDidChange = this.changeEmitter.event;

  private readonly configurationSubscription: vscode.Disposable;

  public constructor() {
    this.configurationSubscription = vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('5board-vsc')) {
        //!
        this.changeEmitter.fire(this.getSettings());
      }
    });
  }

  public getSettings(): FiveBoardSettings {
    const configuration = vscode.workspace.getConfiguration('5board-vsc');

    return {
      java: {
        compilerPath: configuration.get<string>('java.compilerPath', ''),

        runtimePath: configuration.get<string>('java.runtimePath', ''),
      },
      presets: {
        directoryPath: configuration.get<string>('presets.directoryPath', ''),
      },
    };
  }

  public dispose(): void {
    this.configurationSubscription.dispose();
    this.changeEmitter.dispose();
  }
}
