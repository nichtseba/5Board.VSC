import { strict as assert } from 'assert';
import {
  BoardDocument,
  CodeElementData,
  EditorElementType,
  extractBlock,
  hasBlock,
  sanitizeClassName,
} from '5board.vsc-common';
import type { EditorElement } from '5board.vsc-common';
import {
  changeClassLanguage,
  createClass,
  deleteClass,
  deriveCodeClasses,
  moveBlock,
  renameClass,
  resetOutput,
  updateBlockCode,
} from '../board/CodeblockSourceService';

function makeCodeElement(id: string, data: Partial<CodeElementData> = {}): EditorElement {
  return {
    id,
    type: EditorElementType.Code,
    layout: { xPos: 0, yPos: 0, width: 100, height: 100 },
    style: { visible: true },
    data: {
      className: data.className ?? sanitizeClassName(id),
      language: data.language ?? 'java',
    },
  };
}

function makeDocument(elements: EditorElement[]): BoardDocument {
  return {
    manifest: { title: 'test', createdAt: 0, modifiedAt: 0, version: '1' },
    content: { selectedElementId: null, elements, codeClasses: [] },
    sources: [],
    assets: [],
  };
}

function data(doc: BoardDocument, elementId: string): CodeElementData {
  return doc.content.elements.find((e) => e.id === elementId)!.data as CodeElementData;
}

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
      assert.equal(extractBlock(code, 'el1'), 'int x = 1;');
    });

    it('indents the first edit of an empty block at its marker level', function () {
      const doc = makeDocument([makeCodeElement('el1')]);
      createClass(doc, 'Student', 'java');
      moveBlock(doc, 'el1', { className: 'Student' }); // fresh block, no code yet

      updateBlockCode(doc, 'el1', 'private int age;');

      const student = sourceCode(doc, 'Student.java');
      assert.ok(student.includes('    private int age;'));
      assert.equal(extractBlock(student, 'el1'), 'private int age;');
    });

    it('updates an existing block in place, preserving its indentation', function () {
      const doc = makeDocument([makeCodeElement('el1')]);
      updateBlockCode(doc, 'el1', 'int x = 1;');
      updateBlockCode(doc, 'el1', 'int x = 2;');

      const code = sourceCode(doc, 'El1.java');
      assert.equal(extractBlock(code, 'el1'), 'int x = 2;');
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
      assert.equal(extractBlock(student, 'el1'), 'private String name;');
      assert.ok(!student.includes('public static void main'));
      assert.equal(hasBlock(sourceCode(doc, 'El1.java'), 'el1'), false);
    });

    it('collects multiple blocks in one class source', function () {
      const doc = makeDocument([makeCodeElement('a'), makeCodeElement('b')]);
      createClass(doc, 'Student', 'java');
      updateBlockCode(doc, 'a', 'private String name;');
      updateBlockCode(doc, 'b', 'private int age;');

      moveBlock(doc, 'a', { className: 'Student' });
      moveBlock(doc, 'b', { className: 'Student' });

      const student = sourceCode(doc, 'Student.java');
      assert.equal(extractBlock(student, 'a'), 'private String name;');
      assert.equal(extractBlock(student, 'b'), 'private int age;');
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
      assert.equal(extractBlock(code, 'el1'), 'int x = 1;');
      assert.equal(hasBlock(sourceCode(doc, 'Student.java'), 'el1'), false);
    });

    it('ignores moves to unsupported languages', function () {
      const doc = makeDocument([makeCodeElement('el1')]);
      updateBlockCode(doc, 'el1', 'int x = 1;');

      moveBlock(doc, 'el1', { language: 'ruby' });

      assert.equal(data(doc, 'el1').language, 'java');
      assert.equal(extractBlock(sourceCode(doc, 'El1.java'), 'el1'), 'int x = 1;');
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
      createClass(doc, 'Student', 'java');
      createClass(doc, 'Student', 'java');
      createClass(doc, 'El1', 'java'); // would hijack el1's runnable source

      assert.equal(doc.content.codeClasses.length, 1);
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
      assert.equal(extractBlock(person, 'el1'), 'private String name;');
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

      renameClass(doc, 'Student', 'Person', 'java');

      assert.deepEqual(doc.content.codeClasses, [{ name: 'Student', language: 'java' }]);
      assert.equal(doc.sources.filter((s) => s.name === 'Person.java').length, 1);
    });

    it('deleteClass refuses while the class still has member blocks', function () {
      const doc = makeDocument([makeCodeElement('el1')]);
      createClass(doc, 'Student', 'java');
      updateBlockCode(doc, 'el1', 'int x = 1;');
      moveBlock(doc, 'el1', { className: 'Student' });

      const result = deleteClass(doc, 'Student', 'java');

      assert.equal(result, 'rejected-not-empty');
      assert.deepEqual(doc.content.codeClasses, [{ name: 'Student', language: 'java' }]);
      assert.equal(data(doc, 'el1').className, 'Student');
      assert.equal(hasBlock(sourceCode(doc, 'Student.java'), 'el1'), true);
    });

    it('deleteClass removes an empty class and keeps its source as a zombie', function () {
      const doc = makeDocument([makeCodeElement('el1')]);
      createClass(doc, 'Student', 'java');
      updateBlockCode(doc, 'el1', 'int x = 1;');
      moveBlock(doc, 'el1', { className: 'Student' });
      moveBlock(doc, 'el1', { className: null }); // class is empty again

      const result = deleteClass(doc, 'Student', 'java');

      assert.equal(result, 'deleted');
      assert.equal(doc.content.codeClasses.length, 0);
      assert.ok(doc.sources.some((s) => s.name === 'Student.java')); // zombie stays
    });

    it('deleteClass reports an unknown class', function () {
      const doc = makeDocument([]);

      assert.equal(deleteClass(doc, 'Student', 'java'), 'not-found');
    });

    // The happy path (moving members across languages) needs a second entry in
    // SUPPORTED_LANGUAGES and can only be covered once one exists; the guards are testable now.
    it('changeClassLanguage ignores unsupported target languages', function () {
      const doc = makeDocument([makeCodeElement('el1')]);
      createClass(doc, 'Student', 'java');
      updateBlockCode(doc, 'el1', 'private int age;');
      moveBlock(doc, 'el1', { className: 'Student' });

      changeClassLanguage(doc, 'Student', 'java', 'ruby');

      assert.deepEqual(doc.content.codeClasses, [{ name: 'Student', language: 'java' }]);
      assert.equal(data(doc, 'el1').language, 'java');
      assert.equal(hasBlock(sourceCode(doc, 'Student.java'), 'el1'), true);
    });

    it('changeClassLanguage is a no-op for the current language', function () {
      const doc = makeDocument([]);
      createClass(doc, 'Student', 'java');

      changeClassLanguage(doc, 'Student', 'java', 'java');

      assert.deepEqual(doc.content.codeClasses, [{ name: 'Student', language: 'java' }]);
      assert.equal(doc.sources.length, 1);
    });
  });

  describe('resetOutput', function () {
    it('clears a stored transcript and reports that it did', function () {
      const doc = makeDocument([makeCodeElement('el-1')]);
      data(doc, 'el-1').lastOutput = {
        transcript: [{ kind: 'out', text: 'hi' }],
        success: true,
        exitCode: 0,
      };

      assert.equal(resetOutput(doc, 'el-1'), true);
      assert.equal(data(doc, 'el-1').lastOutput, undefined);
      assert.equal('lastOutput' in data(doc, 'el-1'), false);
    });

    it('reports no change when there is nothing stored', function () {
      const doc = makeDocument([makeCodeElement('el-1')]);

      assert.equal(resetOutput(doc, 'el-1'), false);
    });

    it('reports no change for an unknown element', function () {
      const doc = makeDocument([makeCodeElement('el-1')]);

      assert.equal(resetOutput(doc, 'nope'), false);
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
