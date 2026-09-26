import { strict as assert } from 'assert';
import { BoardDocument, extractBlock, hasBlock } from '5board.vsc-common';
import {
  changeClassLanguage,
  createClass,
  deleteClass,
  deriveCodeClasses,
  moveBlock,
  nextCodeBlockId,
  renameClass,
  updateBlockCode,
  updateClass,
} from '../board/CodeblockSourceService';
import { data, makeCodeElement, makeDocument } from './codeblockTestUtils';

function sourceCode(doc: BoardDocument, name: string): string {
  const source = doc.sources.find((s) => s.name === name);
  assert.ok(source, `source ${name} not found`);
  return source.code;
}

describe('CodeblockSourceService', function () {
  describe('updateBlockCode', function () {
    it('creates a compact runnable source on first edit of a standalone block', function () {
      const doc = makeDocument([makeCodeElement('el1')]);
      updateBlockCode(doc, 'el1', 'int x = 1;');

      const code = sourceCode(doc, 'El1.java');
      assert.ok(code.includes('void main() {'));
      assert.ok(!code.includes('class'));
      assert.equal(extractBlock(code, 'el1', '//'), 'int x = 1;');
    });

    it('indents the first edit of an empty block at its marker level', function () {
      const doc = makeDocument([makeCodeElement('el1')]);
      createClass(doc, 'Student', 'java');
      moveBlock(doc, 'el1', { className: 'Student' }); // fresh block, no code yet

      updateBlockCode(doc, 'el1', 'private int age;');

      const student = sourceCode(doc, 'Student.java');
      assert.ok(student.includes('    private int age;'));
      assert.equal(extractBlock(student, 'el1', '//'), 'private int age;');
    });

    it('updates an existing block in place, preserving its indentation', function () {
      const doc = makeDocument([makeCodeElement('el1')]);
      updateBlockCode(doc, 'el1', 'int x = 1;');
      updateBlockCode(doc, 'el1', 'int x = 2;');

      const code = sourceCode(doc, 'El1.java');
      assert.equal(extractBlock(code, 'el1', '//'), 'int x = 2;');
      assert.ok(code.includes('    int x = 2;'));
      assert.ok(code.includes('    // </block>'));
      assert.equal((code.match(/public class/g) ?? []).length, 0);
    });
  });

  describe('moveBlock', function () {
    it('moves a standalone block into a named class, carrying its code', function () {
      const doc = makeDocument([makeCodeElement('el1')]);
      createClass(doc, 'Student', 'java');
      updateBlockCode(doc, 'el1', 'private String name;');

      moveBlock(doc, 'el1', { className: 'Student' });

      assert.equal(data(doc, 'el1').className, 'Student');
      const student = sourceCode(doc, 'Student.java');
      assert.equal(extractBlock(student, 'el1', '//'), 'private String name;');
      assert.ok(!student.includes('public static void main'));
      assert.equal(hasBlock(sourceCode(doc, 'El1.java'), 'el1', '//'), false);
    });

    it('collects multiple blocks in one class source', function () {
      const doc = makeDocument([makeCodeElement('a'), makeCodeElement('b')]);
      createClass(doc, 'Student', 'java');
      updateBlockCode(doc, 'a', 'private String name;');
      updateBlockCode(doc, 'b', 'private int age;');

      moveBlock(doc, 'a', { className: 'Student' });
      moveBlock(doc, 'b', { className: 'Student' });

      const student = sourceCode(doc, 'Student.java');
      assert.equal(extractBlock(student, 'a', '//'), 'private String name;');
      assert.equal(extractBlock(student, 'b', '//'), 'private int age;');
      assert.equal((student.match(/public class/g) ?? []).length, 1);
    });

    it('rebuilds the main-wrapped default source when a block returns to standalone', function () {
      const doc = makeDocument([makeCodeElement('el1')]);
      createClass(doc, 'Student', 'java');
      updateBlockCode(doc, 'el1', 'int x = 1;');
      moveBlock(doc, 'el1', { className: 'Student' });

      moveBlock(doc, 'el1', { className: null });

      assert.equal(data(doc, 'el1').className, 'El1');
      const code = sourceCode(doc, 'El1.java');
      assert.ok(code.includes('void main() {'));
      assert.equal(extractBlock(code, 'el1', '//'), 'int x = 1;');
      assert.equal(hasBlock(sourceCode(doc, 'Student.java'), 'el1', '//'), false);
    });

    it('re-homes a standalone block into another language', function () {
      const doc = makeDocument([makeCodeElement('el1')]);
      updateBlockCode(doc, 'el1', 'int x = 1;');

      moveBlock(doc, 'el1', { language: 'python' });

      assert.equal(data(doc, 'el1').language, 'python');
      // The java source stays behind as a zombie; translating the code is the user's job.
      assert.equal(hasBlock(sourceCode(doc, 'El1.java'), 'el1', '//'), false);
      assert.equal(extractBlock(sourceCode(doc, 'El1.py'), 'el1', '#'), 'int x = 1;');
    });

    it('refuses to move a block into a named class of a language without them', function () {
      const doc = makeDocument([makeCodeElement('el1', { language: 'python' })]);
      updateBlockCode(doc, 'el1', 'print(1)');

      moveBlock(doc, 'el1', { className: 'Student' });

      assert.equal(data(doc, 'el1').className, 'El1');
      assert.equal(extractBlock(sourceCode(doc, 'El1.py'), 'el1', '#'), 'print(1)');
    });

    it('ignores moves to unsupported languages', function () {
      const doc = makeDocument([makeCodeElement('el1')]);
      updateBlockCode(doc, 'el1', 'int x = 1;');

      moveBlock(doc, 'el1', { language: 'ruby' });

      assert.equal(data(doc, 'el1').language, 'java');
      assert.equal(extractBlock(sourceCode(doc, 'El1.java'), 'el1', '//'), 'int x = 1;');
    });
  });

  describe('class registry', function () {
    it('createClass registers the class and eagerly creates an empty source', function () {
      const doc = makeDocument([]);
      createClass(doc, 'Student', 'java');

      assert.deepEqual(doc.content.codeClasses, [{ name: 'Student', language: 'java' }]);
      assert.ok(sourceCode(doc, 'Student.java').includes('public class Student {'));
    });

    it('createClass rejects duplicates and default class names of existing blocks', function () {
      const doc = makeDocument([makeCodeElement('el1')]);
      assert.equal(createClass(doc, 'Student', 'java'), 'ok');
      assert.equal(createClass(doc, 'Student', 'java'), 'name-taken');
      // Would hijack el1's runnable source.
      assert.equal(createClass(doc, 'El1', 'java'), 'name-taken');

      assert.equal(doc.content.codeClasses.length, 1);
    });

    it('createClass rejects a language without named classes', function () {
      const doc = makeDocument([]);

      assert.equal(createClass(doc, 'Student', 'python'), 'invalid');
      assert.deepEqual(doc.content.codeClasses, []);
    });

    it('changeClassLanguage rejects a target language without named classes', function () {
      const doc = makeDocument([]);
      createClass(doc, 'Student', 'java');

      assert.equal(changeClassLanguage(doc, 'Student', 'java', 'python'), 'invalid');
      assert.deepEqual(doc.content.codeClasses, [{ name: 'Student', language: 'java' }]);
    });

    it('renameClass updates the registry, the source, and member elements', function () {
      const doc = makeDocument([makeCodeElement('el1')]);
      createClass(doc, 'Student', 'java');
      updateBlockCode(doc, 'el1', 'private String name;');
      moveBlock(doc, 'el1', { className: 'Student' });

      renameClass(doc, 'Student', 'Person', 'java');

      assert.deepEqual(doc.content.codeClasses, [{ name: 'Person', language: 'java' }]);
      assert.equal(data(doc, 'el1').className, 'Person');
      const person = sourceCode(doc, 'Person.java');
      assert.ok(person.includes('public class Person {'));
      assert.equal(extractBlock(person, 'el1', '//'), 'private String name;');
      assert.equal(doc.sources.length, 2); // Person.java + el1's zombie default source
    });

    it('renameClass rejects a target name whose source file already exists', function () {
      const doc = makeDocument([]);
      createClass(doc, 'Student', 'java');
      doc.sources.push({
        name: 'Person.java',
        language: 'java',
        code: 'public class Person {\n}\n',
        createdAt: 0,
        modifiedAt: 0,
      });

      assert.equal(renameClass(doc, 'Student', 'Person', 'java'), 'name-taken');

      assert.deepEqual(doc.content.codeClasses, [{ name: 'Student', language: 'java' }]);
      assert.equal(doc.sources.filter((s) => s.name === 'Person.java').length, 1);
    });

    it('deleteClass refuses while the class still has member blocks', function () {
      const doc = makeDocument([makeCodeElement('el1')]);
      createClass(doc, 'Student', 'java');
      updateBlockCode(doc, 'el1', 'int x = 1;');
      moveBlock(doc, 'el1', { className: 'Student' });

      const result = deleteClass(doc, 'Student', 'java');

      assert.equal(result, 'not-empty');
      assert.deepEqual(doc.content.codeClasses, [{ name: 'Student', language: 'java' }]);
      assert.equal(data(doc, 'el1').className, 'Student');
      assert.equal(hasBlock(sourceCode(doc, 'Student.java'), 'el1', '//'), true);
    });

    it('deleteClass removes an empty class and keeps its source as a zombie', function () {
      const doc = makeDocument([makeCodeElement('el1')]);
      createClass(doc, 'Student', 'java');
      updateBlockCode(doc, 'el1', 'int x = 1;');
      moveBlock(doc, 'el1', { className: 'Student' });
      moveBlock(doc, 'el1', { className: null }); // class is empty again

      const result = deleteClass(doc, 'Student', 'java');

      assert.equal(result, 'ok');
      assert.equal(doc.content.codeClasses.length, 0);
      assert.ok(doc.sources.some((s) => s.name === 'Student.java')); // zombie stays
    });

    it('deleteClass reports an unknown class', function () {
      const doc = makeDocument([]);

      assert.equal(deleteClass(doc, 'Student', 'java'), 'not-found');
    });

    // The happy path needs a second supported language; only the guards are testable for now.
    it('changeClassLanguage ignores unsupported target languages', function () {
      const doc = makeDocument([makeCodeElement('el1')]);
      createClass(doc, 'Student', 'java');
      updateBlockCode(doc, 'el1', 'private int age;');
      moveBlock(doc, 'el1', { className: 'Student' });

      changeClassLanguage(doc, 'Student', 'java', 'ruby');

      assert.deepEqual(doc.content.codeClasses, [{ name: 'Student', language: 'java' }]);
      assert.equal(data(doc, 'el1').language, 'java');
      assert.equal(hasBlock(sourceCode(doc, 'Student.java'), 'el1', '//'), true);
    });

    it('changeClassLanguage is a no-op for the current language', function () {
      const doc = makeDocument([]);
      createClass(doc, 'Student', 'java');

      changeClassLanguage(doc, 'Student', 'java', 'java');

      assert.deepEqual(doc.content.codeClasses, [{ name: 'Student', language: 'java' }]);
      assert.equal(doc.sources.length, 1);
    });
  });

  describe('updateClass', function () {
    it('renames and addresses the class by its sanitized new name', function () {
      const doc = makeDocument([makeCodeElement('el1')]);
      createClass(doc, 'Student', 'java');
      moveBlock(doc, 'el1', { className: 'Student' });

      assert.equal(updateClass(doc, 'Student', 'java', { newName: 'my person' }), 'ok');

      assert.deepEqual(doc.content.codeClasses, [{ name: 'Myperson', language: 'java' }]);
      assert.equal(data(doc, 'el1').className, 'Myperson');
    });

    it('stops at a rejected rename', function () {
      const doc = makeDocument([]);
      createClass(doc, 'Student', 'java');
      createClass(doc, 'Person', 'java');

      assert.equal(
        updateClass(doc, 'Student', 'java', { newName: 'Person', newLanguage: 'ruby' }),
        'name-taken',
      );
      assert.equal(doc.content.codeClasses[0].name, 'Student');
    });

    it('reports nothing to do when neither name nor language changes', function () {
      const doc = makeDocument([]);
      createClass(doc, 'Student', 'java');

      assert.equal(
        updateClass(doc, 'Student', 'java', { newName: 'Student', newLanguage: 'java' }),
        'unchanged',
      );
    });
  });

  describe('nextCodeBlockId', function () {
    it('starts at Code1 and fills the smallest gap', function () {
      assert.equal(nextCodeBlockId(makeDocument([])), 'Code1');
      const doc = makeDocument([makeCodeElement('Code1'), makeCodeElement('Code3')]);
      assert.equal(nextCodeBlockId(doc), 'Code2');
    });

    it('skips names taken by a registered class or a leftover source, ignoring case', function () {
      const doc = makeDocument([makeCodeElement('code1')]);
      createClass(doc, 'Code2', 'java');
      doc.sources.push({
        name: 'Code3.py',
        language: 'python',
        code: '',
        createdAt: 0,
        modifiedAt: 0,
      });

      assert.equal(nextCodeBlockId(doc), 'Code4');
    });
  });

  describe('deriveCodeClasses (back-compat)', function () {
    it('classifies sources not addressed by any default class name as named classes', function () {
      const doc = makeDocument([makeCodeElement('el1')]);
      updateBlockCode(doc, 'el1', 'int x = 1;');
      createClass(doc, 'Student', 'java');

      const derived = deriveCodeClasses(doc.content, doc.sources);

      assert.deepEqual(derived, [{ name: 'Student', language: 'java' }]);
    });
  });
});
