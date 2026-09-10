import { readdir, stat } from 'fs/promises';
import { homedir } from 'os';
import { posix as posixPath, win32 as win32Path } from 'path';
import { runCommand } from './runnerUtils';

/** Compact source files (JEP 512) are only supported from this release on. */
export const MIN_JAVA_MAJOR = 25;

/** Which stage of the fallback chain produced a toolchain. */
export type ToolchainSource = 'config' | 'java-home' | 'well-known' | 'path';

export interface JavaToolchain {
  javaPath: string;
  javacPath: string;
  majorVersion: number;
  /** Undefined when resolved from PATH, where there is no JDK home to point at. */
  home?: string;
  source: ToolchainSource;
}

export type StageOutcome =
  | 'not-set'
  | 'not-found'
  | 'incomplete'
  | 'too-old'
  | 'version-mismatch'
  | 'ok'
  | 'not-reached';

/** One inspected stage, kept for the diagnostics command and the "nothing found" message. */
export interface CheckedStage {
  source: ToolchainSource;
  outcome: StageOutcome;
  path?: string;
  majorVersion?: number;
  missing?: string[];
}

/**
 * Structured failures — never prose. `describeToolchainFailure` is the single place that turns
 * these into text, so the diagnostics command can render the same data differently and a later
 * localization only has to touch one function.
 */
export type ToolchainFailure =
  | { kind: 'config-not-found'; path: string }
  | { kind: 'incomplete-jdk'; path: string; missing: string[] }
  | { kind: 'too-old'; path: string; found: number; required: number }
  | { kind: 'version-mismatch'; path: string; java: number; javac: number }
  | { kind: 'not-found'; checked: CheckedStage[] };

export type ToolchainResult =
  | { ok: true; toolchain: JavaToolchain; checked: CheckedStage[] }
  | { ok: false; failure: ToolchainFailure; checked: CheckedStage[] };

/**
 * Everything the chain touches outside itself. Injected so the tests can play through all three
 * operating systems with a made-up file system and no real process spawns.
 */
export interface ToolchainEnvironment {
  platform: NodeJS.Platform;
  env: Record<string, string | undefined>;
  homeDir: string;
  isDirectory(path: string): Promise<boolean>;
  isFile(path: string): Promise<boolean>;
  listDirectory(path: string): Promise<string[]>;
  run(command: string, args: string[]): Promise<{ stdout: string; status: number | null }>;
}

export const defaultToolchainEnvironment: ToolchainEnvironment = {
  platform: process.platform,
  env: process.env,
  homeDir: homedir(),
  isDirectory: (path) => statKind(path, 'directory'),
  isFile: (path) => statKind(path, 'file'),
  listDirectory: async (path) => {
    try {
      return await readdir(path);
    } catch {
      return [];
    }
  },
  run: async (command, args) => {
    const result = await runCommand(command, args, process.cwd(), 5_000);
    // `java --version` prints to stdout, but keep stderr as a fallback for odd distributions.
    return { stdout: result.stdout || result.stderr, status: result.error ? null : result.status };
  },
};

async function statKind(path: string, kind: 'file' | 'directory'): Promise<boolean> {
  try {
    const stats = await stat(path);
    return kind === 'file' ? stats.isFile() : stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Parses the major version out of a tool's `--version` output.
 * "javac 25.0.2" -> 25, "java 25.0.2 2026-01-20 LTS" -> 25, legacy "javac 1.8.0_402" -> 8.
 */
export function parseJavaMajor(versionOutput: string): number | undefined {
  const match = versionOutput.match(/(\d+)(?:\.(\d+))?/);
  if (!match) return undefined;

  const first = Number(match[1]);
  // Pre-9 releases are versioned "1.x" — there the second number is the major one.
  if (first === 1 && match[2] !== undefined) return Number(match[2]);
  return first;
}

/**
 * Path handling follows the *inspected* platform, not the host, so the tests can play through
 * Windows, macOS and Linux layouts on whatever machine they run on.
 */
function pathFor(platform: NodeJS.Platform) {
  return platform === 'win32' ? win32Path : posixPath;
}

function toolFileName(tool: 'java' | 'javac', platform: NodeJS.Platform): string {
  return platform === 'win32' ? `${tool}.exe` : tool;
}

function binaryIn(home: string, tool: 'java' | 'javac', platform: NodeJS.Platform): string {
  return pathFor(platform).join(home, 'bin', toolFileName(tool, platform));
}

/**
 * Accepts a JDK home, its `bin` directory, or a `java`/`javac` binary and returns the home.
 * The settings entry is meant to hold a home, but users reasonably paste any of the three.
 */
export function normalizeJavaHome(input: string, platform: NodeJS.Platform): string {
  const p = pathFor(platform);
  const trimmed = input.trim().replace(/[\\/]+$/, '');
  if (!trimmed) return trimmed;

  const name = p.basename(trimmed).toLowerCase();
  if (name === 'java' || name === 'java.exe' || name === 'javac' || name === 'javac.exe') {
    return p.dirname(p.dirname(trimmed));
  }
  if (name === 'bin') return p.dirname(trimmed);
  return trimmed;
}

type HomeInspection =
  | { kind: 'ok'; majorVersion: number }
  | { kind: 'not-found' }
  | { kind: 'incomplete'; missing: string[] }
  | { kind: 'too-old'; found: number }
  | { kind: 'version-mismatch'; java: number; javac: number };

async function readMajor(
  environment: ToolchainEnvironment,
  binary: string,
): Promise<number | undefined> {
  // `--version` (not `-version`) so both tools report on stdout.
  const result = await environment.run(binary, ['--version']);
  if (result.status !== 0) return undefined;
  return parseJavaMajor(result.stdout);
}

/** Inspects a JDK home: both binaries present, same major version, new enough. */
async function inspectHome(
  environment: ToolchainEnvironment,
  home: string,
): Promise<HomeInspection> {
  if (!(await environment.isDirectory(home))) return { kind: 'not-found' };

  const javaPath = binaryIn(home, 'java', environment.platform);
  const javacPath = binaryIn(home, 'javac', environment.platform);

  const missing: string[] = [];
  if (!(await environment.isFile(javaPath))) missing.push('java');
  if (!(await environment.isFile(javacPath))) missing.push('javac');
  if (missing.length > 0) return { kind: 'incomplete', missing };

  return inspectBinaries(environment, javaPath, javacPath);
}

/** Inspects two binaries that are already known to be launchable (home or PATH). */
async function inspectBinaries(
  environment: ToolchainEnvironment,
  javaPath: string,
  javacPath: string,
): Promise<HomeInspection> {
  const javaMajor = await readMajor(environment, javaPath);
  const javacMajor = await readMajor(environment, javacPath);

  const missing: string[] = [];
  if (javaMajor === undefined) missing.push('java');
  if (javacMajor === undefined) missing.push('javac');
  if (missing.length > 0) return { kind: 'incomplete', missing };

  // A JRE `java` paired with a foreign `javac` would only surface as an
  // UnsupportedClassVersionError at run time, so reject the pairing here.
  if (javaMajor !== javacMajor) {
    return { kind: 'version-mismatch', java: javaMajor!, javac: javacMajor! };
  }
  if (javacMajor! < MIN_JAVA_MAJOR) return { kind: 'too-old', found: javacMajor! };

  return { kind: 'ok', majorVersion: javacMajor! };
}

function stageFor(
  source: ToolchainSource,
  path: string | undefined,
  inspection: HomeInspection,
): CheckedStage {
  switch (inspection.kind) {
    case 'ok':
      return { source, path, outcome: 'ok', majorVersion: inspection.majorVersion };
    case 'too-old':
      return { source, path, outcome: 'too-old', majorVersion: inspection.found };
    case 'incomplete':
      return { source, path, outcome: 'incomplete', missing: inspection.missing };
    case 'version-mismatch':
      return { source, path, outcome: 'version-mismatch', majorVersion: inspection.javac };
    case 'not-found':
      return { source, path, outcome: 'not-found' };
  }
}

function failureFor(path: string, inspection: HomeInspection): ToolchainFailure | undefined {
  switch (inspection.kind) {
    case 'not-found':
      return { kind: 'config-not-found', path };
    case 'incomplete':
      return { kind: 'incomplete-jdk', path, missing: inspection.missing };
    case 'too-old':
      return { kind: 'too-old', path, found: inspection.found, required: MIN_JAVA_MAJOR };
    case 'version-mismatch':
      return {
        kind: 'version-mismatch',
        path,
        java: inspection.java,
        javac: inspection.javac,
      };
    case 'ok':
      return undefined;
  }
}

/** Directory patterns per platform, kept as data so a wrong guess is a data fix, not a rewrite. */
function wellKnownRoots(environment: ToolchainEnvironment): string[] {
  const { platform, env, homeDir } = environment;
  const { join } = pathFor(platform);

  if (platform === 'win32') {
    const programFiles = env.ProgramFiles ?? 'C:\\Program Files';
    const localAppData = env.LOCALAPPDATA ?? join(homeDir, 'AppData', 'Local');
    return [
      join(programFiles, 'Java'),
      join(programFiles, 'Eclipse Adoptium'),
      join(programFiles, 'Microsoft'),
      join(programFiles, 'Amazon Corretto'),
      join(localAppData, 'Programs', 'Eclipse Adoptium'),
    ];
  }

  if (platform === 'darwin') {
    return [
      '/Library/Java/JavaVirtualMachines',
      join(homeDir, 'Library/Java/JavaVirtualMachines'),
      '/opt/homebrew/opt',
      '/usr/local/opt',
      join(homeDir, '.sdkman/candidates/java'),
    ];
  }

  return [
    '/usr/lib/jvm',
    '/usr/java',
    '/opt/java',
    '/opt',
    join(homeDir, '.sdkman/candidates/java'),
  ];
}

/**
 * On macOS a JDK home sits below `<entry>/Contents/Home`, and Homebrew nests it once more.
 * Returning several shapes and letting `inspectHome` reject the wrong ones is cheaper than
 * probing the layout first.
 */
function candidateHomes(root: string, entry: string, platform: NodeJS.Platform): string[] {
  const { join } = pathFor(platform);
  const base = join(root, entry);
  if (platform !== 'darwin') return [base];
  return [join(base, 'Contents/Home'), join(base, 'libexec/openjdk.jdk/Contents/Home'), base];
}

/** Highest version-looking number in a directory name, used to try newer JDKs first. */
function versionHint(entry: string): number {
  const numbers = entry.match(/\d+/g);
  if (!numbers) return 0;
  return Math.max(...numbers.map(Number).filter((n) => n >= 8 && n < 1000), 0);
}

const MAX_WELL_KNOWN_CANDIDATES = 8;

async function wellKnownCandidates(environment: ToolchainEnvironment): Promise<string[]> {
  const candidates: string[] = [];

  // macOS ships a resolver that also knows JDKs outside the standard folders — ask it first.
  if (environment.platform === 'darwin') {
    const result = await environment.run('/usr/libexec/java_home', ['-v', String(MIN_JAVA_MAJOR)]);
    const home = result.stdout.trim();
    if (result.status === 0 && home) candidates.push(home);
  }

  for (const root of wellKnownRoots(environment)) {
    const entries = await environment.listDirectory(root);
    const sorted = [...entries].sort((a, b) => versionHint(b) - versionHint(a));
    for (const entry of sorted) {
      candidates.push(...candidateHomes(root, entry, environment.platform));
    }
  }

  return [...new Set(candidates)].slice(0, MAX_WELL_KNOWN_CANDIDATES);
}

let cached: { key: string; toolchain: JavaToolchain; checked: CheckedStage[] } | undefined;

/** Invalidates the per-session cache; call when the configured home changes. */
export function clearToolchainCache(): void {
  cached = undefined;
}

/**
 * Resolves the JDK to compile and run code blocks with.
 *
 * The chain is: configured home -> JAVA_HOME -> well-known install locations -> PATH. A
 * configured home is **terminal** — if it is broken or too old the resolution fails instead of
 * silently falling through, because silently ignoring an explicit choice would leave the user
 * unable to tell which JDK is running. The automatic stages do filter: each candidate is probed
 * and the first one at or above `MIN_JAVA_MAJOR` wins.
 */
export async function resolveJavaToolchain(
  configuredHome?: string,
  environment: ToolchainEnvironment = defaultToolchainEnvironment,
): Promise<ToolchainResult> {
  const key = configuredHome?.trim() ?? '';
  if (cached && cached.key === key) {
    return { ok: true, toolchain: cached.toolchain, checked: cached.checked };
  }

  const checked: CheckedStage[] = [];

  const succeed = (toolchain: JavaToolchain): ToolchainResult => {
    // Only successes are cached: a failure would otherwise survive the user installing a JDK.
    cached = { key, toolchain, checked };
    return { ok: true, toolchain, checked };
  };

  // Stage 1 — the configured home, terminal in both directions.
  if (key) {
    const home = normalizeJavaHome(key, environment.platform);
    const inspection = await inspectHome(environment, home);
    checked.push(stageFor('config', home, inspection));

    if (inspection.kind === 'ok') {
      return succeed(toolchainAt(home, 'config', inspection.majorVersion, environment.platform));
    }
    return { ok: false, failure: failureFor(home, inspection)!, checked };
  }
  checked.push({ source: 'config', outcome: 'not-set' });

  // Stage 2 — JAVA_HOME.
  const javaHome = environment.env.JAVA_HOME?.trim();
  if (javaHome) {
    const home = normalizeJavaHome(javaHome, environment.platform);
    const inspection = await inspectHome(environment, home);
    checked.push(stageFor('java-home', home, inspection));
    if (inspection.kind === 'ok') {
      return succeed(toolchainAt(home, 'java-home', inspection.majorVersion, environment.platform));
    }
  } else {
    checked.push({ source: 'java-home', outcome: 'not-set' });
  }

  // Stage 3 — well-known install locations.
  for (const home of await wellKnownCandidates(environment)) {
    const inspection = await inspectHome(environment, home);
    if (inspection.kind === 'not-found') continue; // a layout guess that did not exist
    checked.push(stageFor('well-known', home, inspection));
    if (inspection.kind === 'ok') {
      return succeed(
        toolchainAt(home, 'well-known', inspection.majorVersion, environment.platform),
      );
    }
  }

  // Stage 4 — PATH, the behaviour that existed before this chain.
  const javaOnPath = toolFileName('java', environment.platform);
  const javacOnPath = toolFileName('javac', environment.platform);
  const pathInspection = await inspectBinaries(environment, javaOnPath, javacOnPath);
  checked.push(stageFor('path', undefined, pathInspection));
  if (pathInspection.kind === 'ok') {
    return succeed({
      javaPath: javaOnPath,
      javacPath: javacOnPath,
      majorVersion: pathInspection.majorVersion,
      source: 'path',
    });
  }

  return { ok: false, failure: { kind: 'not-found', checked }, checked };
}

function toolchainAt(
  home: string,
  source: ToolchainSource,
  majorVersion: number,
  platform: NodeJS.Platform,
): JavaToolchain {
  return {
    javaPath: binaryIn(home, 'java', platform),
    javacPath: binaryIn(home, 'javac', platform),
    majorVersion,
    home,
    source,
  };
}

const STAGE_LABEL: Record<ToolchainSource, string> = {
  config: 'settings',
  'java-home': 'JAVA_HOME',
  'well-known': 'standard install locations',
  path: 'PATH',
};

/**
 * The single place that turns a structured failure into user-facing text. Kept apart from the
 * chain so the diagnostics command can render the same data differently, and so translating
 * these messages later is a change to one function.
 */
export function describeToolchainFailure(failure: ToolchainFailure): string {
  switch (failure.kind) {
    case 'config-not-found':
      return `The configured Java path "${failure.path}" does not exist.`;

    case 'incomplete-jdk': {
      const missing = failure.missing.map((tool) => `bin/${tool}`).join(' and ');
      const verb = failure.missing.length > 1 ? 'are' : 'is';
      // Only a lone missing compiler points at a JRE; if both are gone it is not a JDK at all.
      const hint =
        failure.missing.length === 1 && failure.missing[0] === 'javac'
          ? 'The path most likely points at a JRE (runtime only) instead of a JDK — running code blocks needs a JDK with a compiler.'
          : 'The path does not look like a JDK — it should be the directory that contains bin/java and bin/javac.';
      return `${missing} ${verb} missing in "${failure.path}". ${hint}`;
    }

    case 'too-old':
      return (
        `The configured Java path is Java ${failure.found}, but Java ${failure.required} or ` +
        `newer is required. Runnable blocks use compact source files (JEP 512).`
      );

    case 'version-mismatch':
      return (
        `java is version ${failure.java} but javac is version ${failure.javac} — both must come ` +
        `from the same JDK.`
      );

    case 'not-found': {
      // A stage can contribute several entries (one per well-known candidate), so both lists are
      // deduplicated — otherwise the message repeats the same label.
      const searched = [
        ...new Set(
          failure.checked
            .filter((stage) => stage.outcome !== 'not-set')
            .map((stage) => STAGE_LABEL[stage.source]),
        ),
      ];
      const found = [
        ...new Set(
          failure.checked
            .filter((stage) => stage.majorVersion !== undefined)
            .map((stage) => `Java ${stage.majorVersion} (${STAGE_LABEL[stage.source]})`),
        ),
      ];

      return (
        `No JDK ${MIN_JAVA_MAJOR}+ found. Searched: ${searched.join(', ') || 'PATH'}.` +
        (found.length > 0 ? ` Found: ${found.join(', ')}.` : '') +
        ` Runnable blocks use compact source files (JEP 512) and need JDK ${MIN_JAVA_MAJOR}+.`
      );
    }
  }
}

const OUTCOME_LABEL: Record<StageOutcome, string> = {
  'not-set': 'not set',
  'not-found': 'not found',
  incomplete: 'incomplete JDK',
  'too-old': 'too old',
  'version-mismatch': 'java/javac version mismatch',
  ok: 'ok',
  'not-reached': 'not reached',
};

/**
 * Human-readable report for the diagnostics command — same data as the failure messages, shown
 * as a whole so "why is it picking that JDK?" is answerable in one look.
 */
export function formatToolchainReport(
  result: ToolchainResult,
  configuredHome: string | undefined,
): string {
  const lines = ['5Board — Java toolchain', ''];

  lines.push(`  Configured home:  ${configuredHome?.trim() || '(not set)'}`);
  lines.push(`  Minimum required: Java ${MIN_JAVA_MAJOR} (compact source files, JEP 512)`);
  lines.push('');

  if (result.ok) {
    const { toolchain } = result;
    lines.push(`  Selected:         ${toolchain.home ?? '(from PATH)'}`);
    lines.push(`  Via stage:        ${STAGE_LABEL[toolchain.source]}`);
    lines.push(`  Version:          Java ${toolchain.majorVersion}`);
    lines.push(`  java              ${toolchain.javaPath}`);
    lines.push(`  javac             ${toolchain.javacPath}`);
  } else {
    lines.push('  Selected:         (none)');
    lines.push(`  Problem:          ${describeToolchainFailure(result.failure)}`);
  }

  lines.push('', 'Checked:');
  for (const stage of result.checked) {
    const details = [
      stage.path,
      stage.majorVersion !== undefined ? `Java ${stage.majorVersion}` : undefined,
      stage.missing?.length ? `missing ${stage.missing.join(', ')}` : undefined,
    ]
      .filter(Boolean)
      .join(' — ');
    const mark = stage.outcome === 'ok' ? ' <-- selected' : '';
    lines.push(
      `  ${STAGE_LABEL[stage.source].padEnd(26)} ${OUTCOME_LABEL[stage.outcome]}` +
        (details ? `: ${details}` : '') +
        mark,
    );
  }

  return lines.join('\n');
}
