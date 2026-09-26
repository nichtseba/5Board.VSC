import { strict as assert } from 'assert';
import {
  clearToolchainCache,
  normalizeJavaHome,
  parseJavaMajor,
  resolveJavaToolchain,
  type ToolchainEnvironment,
} from '../runner/javaToolchain';
import { describeToolchainFailure } from '../runner/javaToolchainMessages';

/**
 * A made-up file system and tool set, so every operating system's layout can be played through
 * on whatever machine the tests run on — no real spawns, no real directories.
 *
 * `jdks` maps a JDK home to the major version its binaries report; a home listed in `homes`
 * without an entry here exists but has no working binaries (the JRE case).
 */
function makeEnvironment(options: {
  platform: NodeJS.Platform;
  jdks?: Record<string, number>;
  /** Directories that exist, with their entries. */
  directories?: Record<string, string[]>;
  env?: Record<string, string | undefined>;
  /** Binaries reachable by bare name, i.e. on PATH. */
  onPath?: Record<string, number>;
  homeDir?: string;
}): ToolchainEnvironment {
  const { platform, jdks = {}, directories = {}, env = {}, onPath = {} } = options;
  const separator = platform === 'win32' ? '\\' : '/';
  const suffix = platform === 'win32' ? '.exe' : '';

  const binaries = new Map<string, number>();
  for (const [home, major] of Object.entries(jdks)) {
    binaries.set([home, 'bin', `java${suffix}`].join(separator), major);
    binaries.set([home, 'bin', `javac${suffix}`].join(separator), major);
  }
  for (const [tool, major] of Object.entries(onPath)) {
    binaries.set(tool, major);
  }

  const existingDirectories = new Set([...Object.keys(directories), ...Object.keys(jdks)]);

  return {
    platform,
    env,
    homeDir: options.homeDir ?? (platform === 'win32' ? 'C:\\Users\\test' : '/home/test'),
    isDirectory: async (path) => existingDirectories.has(path),
    isFile: async (path) => binaries.has(path),
    listDirectory: async (path) => directories[path] ?? [],
    run: async (command) => {
      const major = binaries.get(command);
      if (major === undefined) return { stdout: '', status: 1 };
      return { stdout: `${command} ${major}.0.1`, status: 0 };
    },
  };
}

// The chain caches successful resolutions per session, so each test starts from a clean slate.
beforeEach(function () {
  clearToolchainCache();
});

describe('parseJavaMajor', function () {
  it('reads a javac version', function () {
    assert.equal(parseJavaMajor('javac 25.0.2'), 25);
  });

  it('reads a java version line with a release date', function () {
    assert.equal(parseJavaMajor('java 25.0.2 2026-01-20 LTS'), 25);
  });

  it('reads a pre-9 version, where the major is the second number', function () {
    assert.equal(parseJavaMajor('javac 1.8.0_402'), 8);
  });

  it('returns undefined without a version number', function () {
    assert.equal(parseJavaMajor('command not found'), undefined);
  });
});

describe('normalizeJavaHome', function () {
  it('keeps a home unchanged', function () {
    assert.equal(
      normalizeJavaHome('C:\\Program Files\\Java\\jdk-25', 'win32'),
      'C:\\Program Files\\Java\\jdk-25',
    );
  });

  it('strips a trailing separator', function () {
    assert.equal(normalizeJavaHome('/usr/lib/jvm/jdk-25/', 'linux'), '/usr/lib/jvm/jdk-25');
  });

  it('accepts a bin directory', function () {
    assert.equal(normalizeJavaHome('/usr/lib/jvm/jdk-25/bin', 'linux'), '/usr/lib/jvm/jdk-25');
  });

  it('accepts a binary path', function () {
    assert.equal(normalizeJavaHome('C:\\jdk-25\\bin\\javac.exe', 'win32'), 'C:\\jdk-25');
    assert.equal(normalizeJavaHome('/usr/lib/jvm/jdk-25/bin/java', 'linux'), '/usr/lib/jvm/jdk-25');
  });
});

describe('resolveJavaToolchain — configured home is terminal', function () {
  it('uses a configured JDK', async function () {
    const environment = makeEnvironment({
      platform: 'linux',
      jdks: { '/opt/jdk-25': 25 },
    });

    const result = await resolveJavaToolchain('/opt/jdk-25', environment);

    assert.ok(result.ok);
    assert.equal(result.toolchain.source, 'config');
    assert.equal(result.toolchain.majorVersion, 25);
    assert.equal(result.toolchain.javacPath, '/opt/jdk-25/bin/javac');
  });

  it('accepts a configured binary path and derives the home', async function () {
    const environment = makeEnvironment({
      platform: 'linux',
      jdks: { '/opt/jdk-25': 25 },
    });

    const result = await resolveJavaToolchain('/opt/jdk-25/bin/java', environment);

    assert.ok(result.ok);
    assert.equal(result.toolchain.home, '/opt/jdk-25');
  });

  it('fails without searching on when the configured path does not exist', async function () {
    const environment = makeEnvironment({
      platform: 'linux',
      jdks: { '/opt/jdk-25': 25 },
      env: { JAVA_HOME: '/opt/jdk-25' },
    });

    const result = await resolveJavaToolchain('/opt/nope', environment);

    assert.ok(!result.ok);
    assert.equal(result.failure.kind, 'config-not-found');
    // The perfectly good JAVA_HOME must not rescue an explicit choice.
    assert.equal(
      result.checked.some((stage) => stage.source === 'java-home'),
      false,
    );
  });

  it('fails with its own failure kind when the configured JDK is too old', async function () {
    const environment = makeEnvironment({
      platform: 'linux',
      jdks: { '/opt/jdk-21': 21, '/opt/jdk-25': 25 },
      env: { JAVA_HOME: '/opt/jdk-25' },
    });

    const result = await resolveJavaToolchain('/opt/jdk-21', environment);

    assert.ok(!result.ok);
    assert.equal(result.failure.kind, 'too-old');
    assert.equal(result.failure.kind === 'too-old' && result.failure.found, 21);
    assert.equal(
      result.checked.some((stage) => stage.source === 'java-home'),
      false,
    );
  });

  it('reports a JRE (java but no javac) as an incomplete JDK', async function () {
    const environment = makeEnvironment({ platform: 'linux', directories: { '/opt/jre': [] } });
    // A JRE has bin/java but no compiler.
    const withJavaOnly: ToolchainEnvironment = {
      ...environment,
      isFile: async (path) => path === '/opt/jre/bin/java',
    };

    const result = await resolveJavaToolchain('/opt/jre', withJavaOnly);

    assert.ok(!result.ok);
    assert.equal(result.failure.kind, 'incomplete-jdk');
    assert.deepEqual(result.failure.kind === 'incomplete-jdk' ? result.failure.missing : [], [
      'javac',
    ]);
    // The likely cause matters more than the bare fact that a file is missing.
    assert.match(describeToolchainFailure(result.failure), /JRE/);
  });

  it('reports a directory that is no JDK at all without the JRE hint', async function () {
    const environment = makeEnvironment({ platform: 'linux', directories: { '/tmp/random': [] } });

    const result = await resolveJavaToolchain('/tmp/random', environment);

    assert.ok(!result.ok);
    assert.equal(result.failure.kind, 'incomplete-jdk');
    const message = describeToolchainFailure(result.failure);
    assert.match(message, /are missing/);
    assert.equal(/JRE/.test(message), false);
  });
});

describe('resolveJavaToolchain — automatic stages filter by version', function () {
  it('uses JAVA_HOME when it is new enough', async function () {
    const environment = makeEnvironment({
      platform: 'linux',
      jdks: { '/opt/jdk-25': 25 },
      env: { JAVA_HOME: '/opt/jdk-25' },
    });

    const result = await resolveJavaToolchain(undefined, environment);

    assert.ok(result.ok);
    assert.equal(result.toolchain.source, 'java-home');
  });

  it('skips a too-old JAVA_HOME and keeps looking', async function () {
    const environment = makeEnvironment({
      platform: 'linux',
      jdks: { '/opt/jdk-17': 17, '/usr/lib/jvm/jdk-25': 25 },
      directories: { '/usr/lib/jvm': ['jdk-25'] },
      env: { JAVA_HOME: '/opt/jdk-17' },
    });

    const result = await resolveJavaToolchain(undefined, environment);

    assert.ok(result.ok);
    assert.equal(result.toolchain.source, 'well-known');
    assert.equal(result.toolchain.home, '/usr/lib/jvm/jdk-25');
  });

  it('prefers the newest well-known JDK over an older one', async function () {
    const environment = makeEnvironment({
      platform: 'linux',
      jdks: { '/usr/lib/jvm/jdk-17': 17, '/usr/lib/jvm/jdk-25': 25 },
      directories: { '/usr/lib/jvm': ['jdk-17', 'jdk-25'] },
    });

    const result = await resolveJavaToolchain(undefined, environment);

    assert.ok(result.ok);
    assert.equal(result.toolchain.home, '/usr/lib/jvm/jdk-25');
  });

  it('falls back to PATH', async function () {
    const environment = makeEnvironment({
      platform: 'linux',
      onPath: { java: 25, javac: 25 },
    });

    const result = await resolveJavaToolchain(undefined, environment);

    assert.ok(result.ok);
    assert.equal(result.toolchain.source, 'path');
    assert.equal(result.toolchain.home, undefined);
  });

  it('does not accept a too-old PATH toolchain', async function () {
    const environment = makeEnvironment({
      platform: 'linux',
      onPath: { java: 17, javac: 17 },
    });

    const result = await resolveJavaToolchain(undefined, environment);

    assert.ok(!result.ok);
    assert.equal(result.failure.kind, 'not-found');
    // The message has to name what it did find, or "not found" is unhelpable.
    assert.match(describeToolchainFailure(result.failure), /Java 17/);
  });

  it('rejects a java/javac pair from different JDKs', async function () {
    const environment = makeEnvironment({
      platform: 'linux',
      onPath: { java: 17, javac: 25 },
    });

    const result = await resolveJavaToolchain(undefined, environment);

    assert.ok(!result.ok);
    assert.equal(
      result.checked.some((stage) => stage.outcome === 'version-mismatch'),
      true,
    );
  });

  it('names each searched stage only once, however many candidates it had', async function () {
    // Stage 3 pushes one entry per candidate; without dedup the message repeated the label.
    const environment = makeEnvironment({
      platform: 'linux',
      jdks: { '/usr/lib/jvm/jdk-17': 17, '/usr/lib/jvm/jdk-21': 21 },
      directories: { '/usr/lib/jvm': ['jdk-17', 'jdk-21'] },
    });

    const result = await resolveJavaToolchain(undefined, environment);

    assert.ok(!result.ok);
    const message = describeToolchainFailure(result.failure);
    const searched = message.match(/Searched: ([^.]+)\./)![1];
    assert.equal(searched.split(', ').length, new Set(searched.split(', ')).size);
  });

  it('reports nothing found when no stage yields a JDK', async function () {
    const result = await resolveJavaToolchain(undefined, makeEnvironment({ platform: 'linux' }));

    assert.ok(!result.ok);
    assert.equal(result.failure.kind, 'not-found');
    assert.match(describeToolchainFailure(result.failure), /JDK 25\+/);
  });
});

describe('resolveJavaToolchain — platform layouts', function () {
  it('finds a Windows JDK below Program Files', async function () {
    const environment = makeEnvironment({
      platform: 'win32',
      jdks: { 'C:\\Program Files\\Java\\jdk-25': 25 },
      directories: { 'C:\\Program Files\\Java': ['jdk-25'] },
      env: { ProgramFiles: 'C:\\Program Files' },
    });

    const result = await resolveJavaToolchain(undefined, environment);

    assert.ok(result.ok);
    assert.equal(result.toolchain.javacPath, 'C:\\Program Files\\Java\\jdk-25\\bin\\javac.exe');
  });

  it('finds a macOS JDK below Contents/Home', async function () {
    const environment = makeEnvironment({
      platform: 'darwin',
      jdks: { '/Library/Java/JavaVirtualMachines/temurin-25.jdk/Contents/Home': 25 },
      directories: { '/Library/Java/JavaVirtualMachines': ['temurin-25.jdk'] },
    });

    const result = await resolveJavaToolchain(undefined, environment);

    assert.ok(result.ok);
    assert.equal(
      result.toolchain.home,
      '/Library/Java/JavaVirtualMachines/temurin-25.jdk/Contents/Home',
    );
  });

  it('finds a Linux JDK installed via SDKMAN', async function () {
    const environment = makeEnvironment({
      platform: 'linux',
      homeDir: '/home/test',
      jdks: { '/home/test/.sdkman/candidates/java/25.0.2-tem': 25 },
      directories: { '/home/test/.sdkman/candidates/java': ['25.0.2-tem'] },
    });

    const result = await resolveJavaToolchain(undefined, environment);

    assert.ok(result.ok);
    assert.equal(result.toolchain.home, '/home/test/.sdkman/candidates/java/25.0.2-tem');
  });
});
