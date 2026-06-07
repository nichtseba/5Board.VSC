import * as vscode from 'vscode';

/**
 * This class Represents an abstract base for an Extension.
 * No 5Board-specific logic should be implemented here.
 * Implement 5Board-specific logic in {@link FiveBoardExtension}.
 */
export abstract class ExtensionBase {
  private commands: CommandConfig[] = [];

  public registerCommand(id: string, callback: CommandCallback): void {
    this.commands.push({ id, callback });
  }

  /**
   * This should be called from the extension's activate() function to register all components
   * If this is overwritten in a subclass, make sure to call super.activate() to register the components.
   */
  public activate(context: vscode.ExtensionContext): void {
    for (const { id, callback } of this.commands) {
      context.subscriptions.push(vscode.commands.registerCommand(id, callback, this));
    }
  }

  /**
   * This should be called from the extension's deactivate() function to clean up resources
   */
  public deactivate(): void {}
}

export type CommandConfig = {
  id: string;
  callback: CommandCallback;
};

export type CommandCallback<Args extends unknown[] = unknown[]> = (
  this: ExtensionBase,
  ...args: Args
) => void;

export function Command<Args extends unknown[] = unknown[]>(id: string) {
  return function (
    target: CommandCallback<Args>,
    context: ClassMethodDecoratorContext<ExtensionBase>,
  ) {
    context.addInitializer(function (this: ExtensionBase) {
      this.registerCommand(id, target as CommandCallback);
    });
  };
}
