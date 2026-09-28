import {
  DEFAULT_GRID_SETTINGS,
  type GridSettings,
  type ColorPaletteSettings,
} from '5board.vsc-common';
import * as vscode from 'vscode';

export interface JavaSettings {
  home: string;
}

export interface FiveBoardSettings {
  java: JavaSettings;
  grid: GridSettings;
  colorPalette: ColorPaletteSettings;
}

export class SettingsService implements vscode.Disposable {
  private readonly changeEmitter = new vscode.EventEmitter<FiveBoardSettings>();

  public readonly onDidChange = this.changeEmitter.event;

  private readonly configurationSubscription: vscode.Disposable;

  public constructor() {
    this.configurationSubscription = vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('5board-vsc')) {
        this.changeEmitter.fire(this.getSettings());
      }
    });
  }

  public getSettings(): FiveBoardSettings {
    const configuration = vscode.workspace.getConfiguration('5board-vsc');

    return {
      java: {
        home: configuration.get<string>('java.home', ''),
      },
      grid: {
        cellSize: configuration.get<number>('grid.cellSize', DEFAULT_GRID_SETTINGS.cellSize),
        columnCount: configuration.get<number>(
          'grid.columnCount',
          DEFAULT_GRID_SETTINGS.columnCount,
        ),
      },
      colorPalette: {
        customColors: configuration.get<string[]>('colorPalette.customColors', []),
      },
    };
  }

  public dispose(): void {
    this.configurationSubscription.dispose();
    this.changeEmitter.dispose();
  }
}
