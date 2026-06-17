import { strict as assert } from 'assert';
import { extractBlock, hasBlock, insertBlock, updateBlock } from '5board.vsc-common';

const BLOCK_ID = 'test-uuid-123';

function makeSource(code: string): string {
  return `// <block id="${BLOCK_ID}">\n${code}\n// </block>`;
}

describe('codeMarkers', function () {
  describe('extractBlock', function () {
    it('extracts code between markers', function () {
      const source = makeSource('int x = 5;');
      assert.equal(extractBlock(source, BLOCK_ID), 'int x = 5;');
    });

    it('returns null when block id not found', function () {
      assert.equal(extractBlock('some code without markers', BLOCK_ID), null);
    });

    it('returns null when closing marker is missing', function () {
      const source = `// <block id="${BLOCK_ID}">\nint x = 5;`;
      assert.equal(extractBlock(source, BLOCK_ID), null);
    });

    it('extracts multiline code', function () {
      const code = 'int x = 1;\nint y = 2;\nSystem.out.println(x + y);';
      assert.equal(extractBlock(makeSource(code), BLOCK_ID), code);
    });

    it('does not confuse different block ids', function () {
      const source = '// <block id="other">\nwrong\n// </block>\n' + makeSource('correct');
      assert.equal(extractBlock(source, BLOCK_ID), 'correct');
    });

    it('uses python comment prefix', function () {
      const source = `# <block id="${BLOCK_ID}">\nprint("hi")\n# </block>`;
      assert.equal(extractBlock(source, BLOCK_ID, '#'), 'print("hi")');
    });
  });

  describe('hasBlock', function () {
    it('returns true when block exists', function () {
      assert.equal(hasBlock(makeSource('code'), BLOCK_ID), true);
    });

    it('returns false when block does not exist', function () {
      assert.equal(hasBlock('some code', BLOCK_ID), false);
    });
  });

  describe('insertBlock', function () {
    it('appends block to source', function () {
      const result = insertBlock('existing code\n', BLOCK_ID, 'new code');
      assert.ok(result.includes(`// <block id="${BLOCK_ID}">`));
      assert.ok(result.includes('new code'));
      assert.ok(result.includes('// </block>'));
      assert.ok(result.startsWith('existing code\n'));
    });

    it('inserted block can be extracted again', function () {
      const result = insertBlock('', BLOCK_ID, 'int z = 99;');
      assert.equal(extractBlock(result, BLOCK_ID), 'int z = 99;');
    });
  });

  describe('updateBlock', function () {
    it('replaces block content in place', function () {
      const original = makeSource('old code');
      const updated = updateBlock(original, BLOCK_ID, 'new code');
      assert.equal(extractBlock(updated, BLOCK_ID), 'new code');
    });

    it('returns source unchanged when block id not found', function () {
      const source = 'no markers here';
      assert.equal(updateBlock(source, BLOCK_ID, 'anything'), source);
    });
  });
});
