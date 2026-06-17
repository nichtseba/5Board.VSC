import { strict as assert } from 'assert';
import { parseOutputColors } from '5board.vsc-common';

describe('parseOutputColors', function () {
  it('returns single text segment for plain string', function () {
    const result = parseOutputColors('hello world');
    assert.deepEqual(result, [{ kind: 'text', value: 'hello world' }]);
  });

  it('parses a single colored segment', function () {
    const result = parseOutputColors('<C0>red text</C>');
    assert.deepEqual(result, [{ kind: 'colored', colorIndex: 0, value: 'red text' }]);
  });

  it('parses mixed colored and plain segments', function () {
    const result = parseOutputColors('before <C1>green</C> after');
    assert.deepEqual(result, [
      { kind: 'text', value: 'before ' },
      { kind: 'colored', colorIndex: 1, value: 'green' },
      { kind: 'text', value: ' after' },
    ]);
  });

  it('parses multiple colored segments', function () {
    const result = parseOutputColors('<C0>red</C><C2>yellow</C>');
    assert.deepEqual(result, [
      { kind: 'colored', colorIndex: 0, value: 'red' },
      { kind: 'colored', colorIndex: 2, value: 'yellow' },
    ]);
  });

  it('returns empty array for empty string', function () {
    assert.deepEqual(parseOutputColors(''), []);
  });

  it('treats unmatched tags as plain text', function () {
    const result = parseOutputColors('no closing tag <C0>oops');
    assert.deepEqual(result, [{ kind: 'text', value: 'no closing tag <C0>oops' }]);
  });
});
