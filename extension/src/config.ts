/**
 * The single place that knows where user configuration comes from.
 *
 * Everything downstream takes the value as a parameter, so no other module knows that a settings
 * entry exists at all — which is what keeps the key name (and the decision to have one) out of
 * the rest of the code base.
 */

/**
 * The JDK home to compile and run code blocks with, or undefined to auto-detect.
 *
 * TODO: the settings entry itself is being added in a separate work package. Once it exists this
 * becomes a one-liner:
 *   return vscode.workspace.getConfiguration('<section>').get<string>('<key>')?.trim() || undefined;
 * Until then the fallback chain runs its automatic stages (JAVA_HOME -> well-known -> PATH).
 * When wiring it up, also call `clearToolchainCache()` from an `onDidChangeConfiguration` listener
 * so a changed path takes effect without a reload.
 */
export function getConfiguredJavaHome(): string | undefined {
  return undefined;
}
