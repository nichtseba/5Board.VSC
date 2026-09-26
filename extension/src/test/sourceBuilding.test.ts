import { strict as assert } from 'assert';
import {
  buildSource,
  sanitizeClassName,
  isDefaultClassName,
  extractBlock,
  hasBlock,
  insertBlockIntoClass,
  removeBlock,
  getLanguageSupport,
} from '5board.vsc-common';

describe('getLanguageSupport', function () {
  it('provides java', function () {
    assert.equal(getLanguageSupport('java')?.id, 'java');
  });

  it('provides python without a named-class model', function () {
    const support = getLanguageSupport('python');
    assert.equal(support?.id, 'python');
    assert.equal(support?.namedClasses, undefined);
  });

  it('returns undefined for unsupported languages', function () {
    assert.equal(getLanguageSupport('ruby'), undefined);
  });
});

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

  it('produces a compact source file with mainWrap', function () {
    const source = buildSource({
      elementId: 'el-5',
      className: 'Main',
      language: 'java',
      code: 'int x = 1;',
      mainWrap: true,
    });
    // Compact source files (JEP 512) have no class declaration — the class is implicit and
    // named after the file, so the class name must not leak into the source.
    assert.ok(source.includes('void main() {'));
    assert.ok(!source.includes('class'));
    assert.ok(!source.includes('Main'));
  });

  it('indents a runnable block at one level', function () {
    const source = buildSource({
      elementId: 'el-5b',
      className: 'Main',
      language: 'java',
      code: 'int x = 1;',
      mainWrap: true,
    });
    assert.ok(source.includes('    // <block id="el-5b">'));
    assert.ok(source.includes('    int x = 1;'));
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

  it('round-trips a python block, which needs no wrapper', function () {
    const code = 'name = input("Name: ")\nprint(f"hi {name}")';
    const source = buildSource({
      elementId: 'el-py',
      className: 'ElPy',
      language: 'python',
      code,
      mainWrap: true,
    });

    assert.ok(source.startsWith('# <block id="el-py">'));
    assert.equal(extractBlock(source, 'el-py', '#'), code);
  });

  it('round-trips an indented python block', function () {
    const code = 'for i in range(3):\n    print(i)';
    const source = buildSource({
      elementId: 'el-py2',
      className: 'ElPy2',
      language: 'python',
      code,
      mainWrap: true,
    });

    assert.equal(extractBlock(source, 'el-py2', '#'), code);
  });

  it('throws for a named class in a language without them', function () {
    assert.throws(() =>
      buildSource({
        elementId: 'el-py3',
        className: 'Student',
        language: 'python',
        code: 'pass',
        mainWrap: false,
      }),
    );
  });

  it('throws for unsupported languages', function () {
    assert.throws(() =>
      buildSource({
        elementId: 'el-7',
        className: 'Script',
        language: 'ruby',
        code: 'puts 1',
        mainWrap: true,
      }),
    );
  });
});

describe('insertBlockIntoClass', function () {
  it('adds a second block to an existing class, both extractable', function () {
    let source = buildSource({
      elementId: 'a',
      className: 'Student',
      language: 'java',
      code: 'private String name;',
      mainWrap: false,
    });
    source = insertBlockIntoClass(source, 'b', 'private int age;', '//', 4);

    assert.equal(extractBlock(source, 'a', '//'), 'private String name;');
    assert.equal(extractBlock(source, 'b', '//'), 'private int age;');
    assert.ok(source.trimEnd().endsWith('}'));
    assert.equal((source.match(/public class/g) ?? []).length, 1);
  });

  it('round-trips multiline code with internal indentation', function () {
    let source = buildSource({
      elementId: 'a',
      className: 'Student',
      language: 'java',
      code: 'private String name;',
      mainWrap: false,
    });
    const code = 'void greet() {\n    System.out.println(name);\n}';
    source = insertBlockIntoClass(source, 'b', code, '//', 4);
    assert.equal(extractBlock(source, 'b', '//'), code);
  });
});

describe('removeBlock', function () {
  it('removes one block from a two-block class, keeping the other', function () {
    let source = buildSource({
      elementId: 'a',
      className: 'Student',
      language: 'java',
      code: 'private String name;',
      mainWrap: false,
    });
    source = insertBlockIntoClass(source, 'b', 'private int age;', '//', 4);

    source = removeBlock(source, 'a', '//');

    assert.equal(hasBlock(source, 'a', '//'), false);
    assert.equal(extractBlock(source, 'b', '//'), 'private int age;');
    assert.equal((source.match(/public class/g) ?? []).length, 1);
  });

  it('leaves an empty (zombie) class when removing the only block', function () {
    let source = buildSource({
      elementId: 'a',
      className: 'Student',
      language: 'java',
      code: 'private String name;',
      mainWrap: false,
    });
    source = removeBlock(source, 'a', '//');

    assert.equal(hasBlock(source, 'a', '//'), false);
    assert.ok(source.includes('public class Student {'));
    assert.ok(source.trimEnd().endsWith('}'));
  });

  it('returns the source unchanged when the block is absent', function () {
    const source = buildSource({
      elementId: 'a',
      className: 'Student',
      language: 'java',
      code: 'private String name;',
      mainWrap: false,
    });
    assert.equal(removeBlock(source, 'missing', '//'), source);
  });
});
