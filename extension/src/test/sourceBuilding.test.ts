import { strict as assert } from 'assert';
import {
  buildSource,
  sanitizeClassName,
  isDefaultClassName,
  extractBlock,
} from '5board.vsc-common';

describe('sanitizeClassName', function () {
  it('uppercases first letter', function () {
    assert.equal(sanitizeClassName('main'), 'Main');
  });

  it('strips invalid characters', function () {
    assert.equal(sanitizeClassName('my-block!'), 'Myblock');
  });

  it('prefixes with underscore when starting with digit', function () {
    assert.equal(sanitizeClassName('1block'), '_1block');
  });

  it('falls back to Block for empty input', function () {
    assert.equal(sanitizeClassName('---'), 'Block');
  });

  it('keeps valid characters', function () {
    assert.equal(sanitizeClassName('Code1'), 'Code1');
  });
});

describe('isDefaultClassName', function () {
  it('returns true for auto-generated name', function () {
    assert.equal(isDefaultClassName('Code1', 'code1'), true);
  });

  it('returns false for user-chosen name', function () {
    assert.equal(isDefaultClassName('Student', 'code1'), false);
  });
});

describe('buildSource round-trip', function () {
  it('round-trips simple code with mainWrap', function () {
    const code = 'System.out.println("hello");';
    const source = buildSource({
      elementId: 'el-1',
      className: 'Main',
      language: 'java',
      code,
      mainWrap: true,
    });
    const extracted = extractBlock(source, 'el-1', '//');
    assert.equal(extracted, code);
  });

  it('round-trips simple code without mainWrap', function () {
    const code = 'private String name;';
    const source = buildSource({
      elementId: 'el-2',
      className: 'Student',
      language: 'java',
      code,
      mainWrap: false,
    });
    const extracted = extractBlock(source, 'el-2', '//');
    assert.equal(extracted, code);
  });

  it('round-trips multiline code with internal indentation', function () {
    const code = 'if (true) {\n    System.out.println("yes");\n}';
    const source = buildSource({
      elementId: 'el-3',
      className: 'Main',
      language: 'java',
      code,
      mainWrap: true,
    });
    const extracted = extractBlock(source, 'el-3', '//');
    assert.equal(extracted, code);
  });

  it('round-trips code with empty lines', function () {
    const code = 'int x = 1;\n\nint y = 2;';
    const source = buildSource({
      elementId: 'el-4',
      className: 'Main',
      language: 'java',
      code,
      mainWrap: false,
    });
    const extracted = extractBlock(source, 'el-4', '//');
    assert.equal(extracted, code);
  });

  it('produces valid class structure with mainWrap', function () {
    const source = buildSource({
      elementId: 'el-5',
      className: 'Main',
      language: 'java',
      code: 'int x = 1;',
      mainWrap: true,
    });
    assert.ok(source.includes('public class Main {'));
    assert.ok(source.includes('public static void main(String[] args) {'));
  });

  it('produces valid class structure without mainWrap', function () {
    const source = buildSource({
      elementId: 'el-6',
      className: 'Student',
      language: 'java',
      code: 'int x = 1;',
      mainWrap: false,
    });
    assert.ok(source.includes('public class Student {'));
    assert.ok(!source.includes('public static void main'));
  });
});
