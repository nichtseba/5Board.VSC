import { strict as assert } from 'assert';
import * as vscode from 'vscode';
import { FiveBoardFileSystemProvider } from '../FiveBoardFileSystemProvider';

describe('FiveBoardFileSystemProvider.watch', function () {
  function createProvider(): FiveBoardFileSystemProvider {
    return new FiveBoardFileSystemProvider({} as never);
  }

  function fireChange(
    provider: FiveBoardFileSystemProvider,
    uri: vscode.Uri,
    type: vscode.FileChangeType = vscode.FileChangeType.Changed,
  ): void {
    (
      provider as never as { fireChange(uri: vscode.Uri, type: vscode.FileChangeType): void }
    ).fireChange(uri, type);
  }

  it('emits changes for the exact watched file', function () {
    const provider = createProvider();
    const watchedUri = vscode.Uri.from({
      scheme: '5board',
      authority: '',
      path: '/board.5boardz/src/java/Main.java',
      query: '',
      fragment: '',
    });
    const events: vscode.FileChangeEvent[][] = [];

    provider.onDidChangeFile((event) => events.push(event));
    provider.watch(watchedUri, { recursive: false, excludes: [] });

    fireChange(provider, watchedUri);

    assert.equal(events.length, 1);
    assert.equal(events[0].length, 1);
    assert.equal(events[0][0].uri.path, watchedUri.path);
    assert.equal(events[0][0].type, vscode.FileChangeType.Changed);
  });

  it('emits direct child changes for a non-recursive directory watch', function () {
    const provider = createProvider();
    const watchUri = vscode.Uri.from({
      scheme: '5board',
      authority: '',
      path: '/board.5boardz/src/java',
      query: '',
      fragment: '',
    });
    const changedUri = vscode.Uri.joinPath(watchUri, 'Main.java');
    const events: vscode.FileChangeEvent[][] = [];

    provider.onDidChangeFile((event) => events.push(event));
    provider.watch(watchUri, { recursive: false, excludes: [] });

    fireChange(provider, changedUri);

    assert.equal(events.length, 1);
    assert.equal(events[0][0].uri.path, changedUri.path);
  });

  it('ignores deeper descendants for a non-recursive directory watch', function () {
    const provider = createProvider();
    const watchUri = vscode.Uri.from({
      scheme: '5board',
      authority: '',
      path: '/board.5boardz/src',
      query: '',
      fragment: '',
    });
    const changedUri = vscode.Uri.from({
      scheme: '5board',
      authority: '',
      path: '/board.5boardz/src/java/Main.java',
      query: '',
      fragment: '',
    });
    const events: vscode.FileChangeEvent[][] = [];

    provider.onDidChangeFile((event) => events.push(event));
    provider.watch(watchUri, { recursive: false, excludes: [] });

    fireChange(provider, changedUri);

    assert.equal(events.length, 0);
  });

  it('emits deeper descendants for a recursive directory watch', function () {
    const provider = createProvider();
    const watchUri = vscode.Uri.from({
      scheme: '5board',
      authority: '',
      path: '/board.5boardz/src',
      query: '',
      fragment: '',
    });
    const changedUri = vscode.Uri.from({
      scheme: '5board',
      authority: '',
      path: '/board.5boardz/src/java/Main.java',
      query: '',
      fragment: '',
    });
    const events: vscode.FileChangeEvent[][] = [];

    provider.onDidChangeFile((event) => events.push(event));
    provider.watch(watchUri, { recursive: true, excludes: [] });

    fireChange(provider, changedUri);

    assert.equal(events.length, 1);
    assert.equal(events[0][0].uri.path, changedUri.path);
  });

  it('applies absolute exclude paths', function () {
    const provider = createProvider();
    const watchUri = vscode.Uri.from({
      scheme: '5board',
      authority: '',
      path: '/board.5boardz/src/java',
      query: '',
      fragment: '',
    });
    const changedUri = vscode.Uri.joinPath(watchUri, 'Main.java');
    const events: vscode.FileChangeEvent[][] = [];

    provider.onDidChangeFile((event) => events.push(event));
    provider.watch(watchUri, { recursive: true, excludes: [changedUri.path] });

    fireChange(provider, changedUri);

    assert.equal(events.length, 0);
  });

  it('resolves relative exclude paths from the watched uri', function () {
    const provider = createProvider();
    const watchUri = vscode.Uri.from({
      scheme: '5board',
      authority: '',
      path: '/board.5boardz/src/java',
      query: '',
      fragment: '',
    });
    const changedUri = vscode.Uri.joinPath(watchUri, 'Main.java');
    const events: vscode.FileChangeEvent[][] = [];

    provider.onDidChangeFile((event) => events.push(event));
    provider.watch(watchUri, { recursive: true, excludes: ['Main.java'] });

    fireChange(provider, changedUri);

    assert.equal(events.length, 0);
  });

  it('rejects glob-style exclude paths', function () {
    const provider = createProvider();
    const watchUri = vscode.Uri.from({
      scheme: '5board',
      authority: '',
      path: '/board.5boardz/src/java',
      query: '',
      fragment: '',
    });

    assert.throws(
      () => provider.watch(watchUri, { recursive: true, excludes: ['*.java'] }),
      /Glob excludes are not supported/,
    );
  });

  it('stops emitting changes after the watcher is disposed', function () {
    const provider = createProvider();
    const watchedUri = vscode.Uri.from({
      scheme: '5board',
      authority: '',
      path: '/board.5boardz/src/java/Main.java',
      query: '',
      fragment: '',
    });
    const events: vscode.FileChangeEvent[][] = [];

    provider.onDidChangeFile((event) => events.push(event));
    const watcher = provider.watch(watchedUri, { recursive: false, excludes: [] });
    watcher.dispose();

    fireChange(provider, watchedUri);

    assert.equal(events.length, 0);
  });
});
