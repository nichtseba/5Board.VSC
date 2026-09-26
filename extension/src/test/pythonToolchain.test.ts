import { strict as assert } from 'assert';
import {
  clearPythonToolchainCache,
  configuredCandidates,
  parsePythonVersion,
  resolvePythonToolchain,
  type PythonEnvironment,
} from '../runner/pythonToolchain';
import { describePythonFailure } from '../runner/pythonToolchainMessages';

/**
 * A made-up set of interpreters, so every platform's layout can be played through anywhere.
 * `interpreters` maps a command or binary path to the version it reports; `silent` lists
 * commands that run but print no version (the Windows Store placeholder).
 */
function makeEnvironment(options: {
  platform: NodeJS.Platform;
  interpreters?: Record<string, string>;
  silent?: string[];
}): PythonEnvironment {
  const { platform, interpreters = {}, silent = [] } = options;
  return {
    platform,
    isFile: async (path) => path in interpreters || silent.includes(path),
    run: async (command) => {
      if (silent.includes(command)) return { stdout: '', status: 0 };
      const version = interpreters[command];
      if (!version) return { stdout: '', status: 1 };
      return { stdout: `Python ${version}\n`, status: 0 };
    },
  };
}

// Successful resolutions are cached per session, so each test starts from a clean slate.
beforeEach(function () {
  clearPythonToolchainCache();
});

describe('parsePythonVersion', function () {
  it('reads a version line', function () {
    assert.deepEqual(parsePythonVersion('Python 3.12.4'), { major: 3, minor: 12 });
  });

  it('ignores output without a version', function () {
    assert.equal(parsePythonVersion(''), undefined);
    assert.equal(parsePythonVersion('Microsoft Store'), undefined);
  });
});

describe('configuredCandidates', function () {
  it('derives the interpreters of a posix virtual environment', function () {
    assert.deepEqual(configuredCandidates('/opt/venv/', 'linux'), [
      '/opt/venv',
      '/opt/venv/bin/python3',
      '/opt/venv/bin/python',
    ]);
  });

  it('derives the interpreters of a windows installation', function () {
    assert.deepEqual(configuredCandidates('C:\\Python312', 'win32'), [
      'C:\\Python312',
      'C:\\Python312\\python.exe',
      'C:\\Python312\\Scripts\\python.exe',
    ]);
  });
});

describe('resolvePythonToolchain', function () {
  it('prefers python3 on PATH', async function () {
    const result = await resolvePythonToolchain(
      undefined,
      makeEnvironment({ platform: 'linux', interpreters: { python3: '3.12.4', python: '3.9.1' } }),
    );

    assert.ok(result.ok);
    assert.equal(result.toolchain.pythonPath, 'python3');
    assert.deepEqual(result.toolchain.version, { major: 3, minor: 12 });
    assert.equal(result.toolchain.source, 'path');
  });

  it('falls back to python when python3 is missing', async function () {
    const result = await resolvePythonToolchain(
      undefined,
      makeEnvironment({ platform: 'linux', interpreters: { python: '3.11.0' } }),
    );

    assert.ok(result.ok);
    assert.equal(result.toolchain.pythonPath, 'python');
  });

  it('skips a too-old interpreter and reports its version', async function () {
    const environment = makeEnvironment({
      platform: 'linux',
      interpreters: { python3: '2.7.18', python: '3.6.9' },
    });

    const result = await resolvePythonToolchain(undefined, environment);

    assert.equal(result.ok, false);
    assert.ok(!result.ok && result.failure.kind === 'not-found');
    const message = !result.ok ? describePythonFailure(result.failure) : '';
    assert.ok(message.includes('2.7'));
    assert.ok(message.includes('3.6'));
  });

  it('rejects a placeholder that reports no version and says so', async function () {
    const result = await resolvePythonToolchain(
      undefined,
      makeEnvironment({ platform: 'win32', silent: ['python', 'python3'] }),
    );

    assert.equal(result.ok, false);
    assert.ok(!result.ok && result.checked.every((c) => c.outcome === 'no-version'));
    assert.ok(!result.ok && describePythonFailure(result.failure).includes('Store'));
  });

  it('takes a configured interpreter over PATH', async function () {
    const result = await resolvePythonToolchain(
      '/opt/venv',
      makeEnvironment({
        platform: 'linux',
        interpreters: { '/opt/venv/bin/python3': '3.13.0', python3: '3.12.4' },
      }),
    );

    assert.ok(result.ok);
    assert.equal(result.toolchain.pythonPath, '/opt/venv/bin/python3');
    assert.equal(result.toolchain.source, 'config');
  });

  // A configured interpreter is terminal: silently running another one would hide the choice.
  it('fails on a broken configured path instead of falling through to PATH', async function () {
    const result = await resolvePythonToolchain(
      '/opt/gone',
      makeEnvironment({ platform: 'linux', interpreters: { python3: '3.12.4' } }),
    );

    assert.equal(result.ok, false);
    assert.ok(!result.ok && result.failure.kind === 'config-unusable');
    assert.ok(!result.ok && describePythonFailure(result.failure).includes('/opt/gone'));
  });
});
