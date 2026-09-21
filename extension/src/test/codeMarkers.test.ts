import { strict as assert } from 'assert';
import {
  extractBlock,
  getBlockIndent,
  hasBlock,
  indentCode,
  insertBlockIntoClass,
  removeBlock,
  updateBlock,
} from '5board.vsc-common';

const BLOCK_ID = 'test-uuid-123';

function makeSource(code: string): string {
  return `// <block id="${BLOCK_ID}">\n${code}\n// </block>`;
}

describe('codeMarkers', function () {
  // Write and read must be exact inverses, otherwise Monaco's model is replaced and the caret jumps.
  describe('write/read round trip', function () {
    const nested = `void main() {
    // <block id="${BLOCK_ID}">
    
    // </block>
}`;

    function roundTrip(code: string): string | null {
      const indent = getBlockIndent(nested, BLOCK_ID, '//');
      return extractBlock(
        updateBlock(nested, BLOCK_ID, indentCode(code, indent), '//'),
        BLOCK_ID,
        '//',
      );
    }

    it('keeps leading blank lines', function () {
      assert.equal(roundTrip('\n\nfoo();'), '\n\nfoo();');
    });

    it('keeps a trailing blank line', function () {
      assert.equal(roundTrip('foo();\n'), 'foo();\n');
    });

    it('keeps a whitespace-only line inside a block', function () {
      const code = 'while (x) {\n    \n}';
      assert.equal(roundTrip(code), code);
    });

    it('keeps an empty line inside a block', function () {
      const code = 'while (x) {\n\n}';
      assert.equal(roundTrip(code), code);
    });

    it('still dedents real code back to column zero', function () {
      assert.equal(roundTrip('int x = 5;'), 'int x = 5;');
    });
  });

  describe('extractBlock', function () {
    it('extracts code between markers', function () {
      const source = makeSource('int x = 5;');
      assert.equal(extractBlock(source, BLOCK_ID, '//'), 'int x = 5;');
    });

    it('returns null when block id not found', function () {
      assert.equal(extractBlock('some code without markers', BLOCK_ID, '//'), null);
    });

    it('returns null when closing marker is missing', function () {
      const source = `// <block id="${BLOCK_ID}">\nint x = 5;`;
      assert.equal(extractBlock(source, BLOCK_ID, '//'), null);
    });

    it('extracts multiline code', function () {
      const code = 'int x = 1;\nint y = 2;\nSystem.out.println(x + y);';
      assert.equal(extractBlock(makeSource(code), BLOCK_ID, '//'), code);
    });

    it('does not confuse different block ids', function () {
      const source = '// <block id="other">\nwrong\n// </block>\n' + makeSource('correct');
      assert.equal(extractBlock(source, BLOCK_ID, '//'), 'correct');
    });

    it('uses python comment prefix', function () {
      const source = `# <block id="${BLOCK_ID}">\nprint("hi")\n# </block>`;
      assert.equal(extractBlock(source, BLOCK_ID, '#'), 'print("hi")');
    });
  });

  describe('hasBlock', function () {
    it('returns true when block exists', function () {
      assert.equal(hasBlock(makeSource('code'), BLOCK_ID, '//'), true);
    });

    it('returns false when block does not exist', function () {
      assert.equal(hasBlock('some code', BLOCK_ID, '//'), false);
    });
  });

  describe('updateBlock', function () {
    it('replaces block content in place', function () {
      const original = makeSource('old code');
      const updated = updateBlock(original, BLOCK_ID, 'new code', '//');
      assert.equal(extractBlock(updated, BLOCK_ID, '//'), 'new code');
    });

    it('returns source unchanged when block id not found', function () {
      const source = 'no markers here';
      assert.equal(updateBlock(source, BLOCK_ID, 'anything', '//'), source);
    });

    it('keeps the closing tag indented like the opening tag', function () {
      const source = `    // <block id="${BLOCK_ID}">\n    old\n    // </block>`;
      const updated = updateBlock(source, BLOCK_ID, '    new', '//');
      assert.equal(updated, `    // <block id="${BLOCK_ID}">\n    new\n    // </block>`);
    });
  });

  describe('insertBlockIntoClass / removeBlock', function () {
    const cls = 'public class Foo {\n}\n';

    it('inserts an indented block before the closing brace', function () {
      assert.equal(
        insertBlockIntoClass(cls, 'a', 'int x;\n\nint y;', '//', 4),
        'public class Foo {\n    // <block id="a">\n    int x;\n\n    int y;\n    // </block>\n}\n',
      );
    });

    it('removes exactly the lines it inserted', function () {
      const inserted = insertBlockIntoClass(cls, 'a', 'int x;', '//', 4);
      assert.equal(removeBlock(inserted, 'a', '//'), cls);
    });
  });
});
