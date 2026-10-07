export function Icons({ name, className }: { name: string; className?: string }) {
  const classes = `codicon codicon-${name}${className ? ` ${className}` : ''}`;
  return <span className={classes} />;
}
