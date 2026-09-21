/**
 * Where a language's toolchain home comes from. One entry per language once the settings exist;
 * today every language falls back to its runner's own lookup chain.
 */
// TODO: read the language's settings entry once it exists, and call clearToolchainCache() when
// the Java one changes.
export function getConfiguredHome(_language: string): string | undefined {
  return undefined;
}
