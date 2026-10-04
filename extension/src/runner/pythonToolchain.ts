import { stat } from 'fs/promises';
import { posix as posixPath, win32 as win32Path } from 'path';
import { runCommand } from './runnerUtils';

// `-X utf8` (PEP 540) needs 3.7.
export const MIN_PYTHON_VERSION: PythonVersion = { major: 3, minor: 7 };

export interface PythonVersion {
  major: number;
  minor: number;
}

export type PythonSource = 'config' | 'path';

export interface PythonToolchain {
  pythonPath: string;
  version: PythonVersion;
  source: PythonSource;
}

export type CandidateOutcome =
  | 'not-found'
  /** Ran, but reported no version — a wrapper rather than an interpreter. */
  | 'no-version'
  | 'too-old'
  | 'ok';

export interface CheckedCandidate {
  source: PythonSource;
  command: string;
  outcome: CandidateOutcome;
  version?: PythonVersion;
}

// Structured data only; pythonToolchainMessages.ts turns it into text.
export type PythonFailure =
  | { kind: 'config-unusable'; path: string; checked: CheckedCandidate[] }
  | { kind: 'not-found'; checked: CheckedCandidate[] };

export type PythonToolchainResult =
  | { ok: true; toolchain: PythonToolchain; checked: CheckedCandidate[] }
  | { ok: false; failure: PythonFailure; checked: CheckedCandidate[] };

// Injected so the tests can play through every platform without real interpreters.
export interface PythonEnvironment {
  platform: NodeJS.Platform;
  isFile(path: string): Promise<boolean>;
  run(command: string, args: string[]): Promise<{ stdout: string; status: number | null }>;
}

export const defaultPythonEnvironment: PythonEnvironment = {
  platform: process.platform,
  isFile: async (path) => {
    try {
      return (await stat(path)).isFile();
    } catch {
      return false;
    }
  },
  run: async (command, args) => {
    const result = await runCommand(command, args, process.cwd(), 5_000);
    // Python 3.4 and older print the version to stderr.
    return { stdout: result.stdout || result.stderr, status: result.error ? null : result.status };
  },
};

/** "Python 3.12.4" -> { major: 3, minor: 12 }. */
export function parsePythonVersion(versionOutput: string): PythonVersion | undefined {
  const match = versionOutput.match(/Python\s+(\d+)\.(\d+)/);
  if (!match) return undefined;
  return { major: Number(match[1]), minor: Number(match[2]) };
}

export function formatPythonVersion(version: PythonVersion): string {
  return `${version.major}.${version.minor}`;
}

function isAtLeast(version: PythonVersion, minimum: PythonVersion): boolean {
  if (version.major !== minimum.major) return version.major > minimum.major;
  return version.minor >= minimum.minor;
}

/**
 * Interpreters to try for a configured value, which may be the binary itself, a virtual
 * environment or an install directory.
 */
export function configuredCandidates(home: string, platform: NodeJS.Platform): string[] {
  const p = platform === 'win32' ? win32Path : posixPath;
  const trimmed = home.trim().replace(/[\\/]+$/, '');
  if (!trimmed) return [];

  if (platform === 'win32') {
    return [trimmed, p.join(trimmed, 'python.exe'), p.join(trimmed, 'Scripts', 'python.exe')];
  }
  return [trimmed, p.join(trimmed, 'bin', 'python3'), p.join(trimmed, 'bin', 'python')];
}

// Windows installs ship `python.exe`; a bare `python3` there is usually the Microsoft Store
// placeholder, which reports no version.
function pathCandidates(platform: NodeJS.Platform): string[] {
  return platform === 'win32' ? ['python', 'python3'] : ['python3', 'python'];
}

async function probe(
  environment: PythonEnvironment,
  command: string,
  source: PythonSource,
): Promise<CheckedCandidate> {
  const result = await environment.run(command, ['--version']);
  const version = parsePythonVersion(result.stdout);

  if (result.status !== 0 && !version) return { source, command, outcome: 'not-found' };
  if (!version) return { source, command, outcome: 'no-version' };
  if (!isAtLeast(version, MIN_PYTHON_VERSION)) {
    return { source, command, outcome: 'too-old', version };
  }
  return { source, command, outcome: 'ok', version };
}

let cached: { key: string; toolchain: PythonToolchain; checked: CheckedCandidate[] } | undefined;

export function clearPythonToolchainCache(): void {
  cached = undefined;
}

/**
 * Chain: configured interpreter -> `python3`/`python` on PATH. A configured value is terminal:
 * if it is unusable, resolution fails instead of silently running another interpreter.
 */
export async function resolvePythonToolchain(
  configuredHome?: string,
  environment: PythonEnvironment = defaultPythonEnvironment,
): Promise<PythonToolchainResult> {
  const key = configuredHome?.trim() ?? '';
  if (cached && cached.key === key) {
    return { ok: true, toolchain: cached.toolchain, checked: cached.checked };
  }

  const checked: CheckedCandidate[] = [];
  const succeed = (candidate: CheckedCandidate): PythonToolchainResult => {
    const toolchain: PythonToolchain = {
      pythonPath: candidate.command,
      version: candidate.version!,
      source: candidate.source,
    };
    // Only successes are cached: a failure would otherwise survive installing Python.
    cached = { key, toolchain, checked };
    return { ok: true, toolchain, checked };
  };

  if (key) {
    for (const command of configuredCandidates(key, environment.platform)) {
      if (!(await environment.isFile(command))) continue;
      const candidate = await probe(environment, command, 'config');
      checked.push(candidate);
      if (candidate.outcome === 'ok') return succeed(candidate);
    }
    return { ok: false, failure: { kind: 'config-unusable', path: key, checked }, checked };
  }

  for (const command of pathCandidates(environment.platform)) {
    const candidate = await probe(environment, command, 'path');
    checked.push(candidate);
    if (candidate.outcome === 'ok') return succeed(candidate);
  }

  return { ok: false, failure: { kind: 'not-found', checked }, checked };
}
