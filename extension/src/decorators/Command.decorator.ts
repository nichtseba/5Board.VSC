import { CommandCallback, Extension } from '../Extension.class';

export function Command(id: string) {
  return function (target: CommandCallback, context: ClassMethodDecoratorContext<Extension>) {
    context.addInitializer(function (this: Extension) {
      this.registerCommand(id, target);
    });
  };
}
