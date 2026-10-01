import { strict as assert } from 'assert';
import {
  hasStoredOutputs,
  resetAllOutputs,
  resetOutput,
  setLastOutput,
  setOutputCollapsed,
} from '../board/CodeblockOutputService';
import { data, makeCodeElement, makeDocument } from './codeblockTestUtils';

describe('CodeblockOutputService', function () {
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

  describe('resetAllOutputs', function () {
    it('clears every stored transcript and returns only the blocks that had one', function () {
      const doc = makeDocument([
        makeCodeElement('el-1'),
        makeCodeElement('el-2'),
        makeCodeElement('el-3'),
      ]);
      for (const id of ['el-1', 'el-3']) {
        data(doc, id).lastOutput = { transcript: [], success: true, exitCode: 0 };
      }

      assert.deepEqual(resetAllOutputs(doc), ['el-1', 'el-3']);
      assert.equal(data(doc, 'el-1').lastOutput, undefined);
      assert.equal(data(doc, 'el-3').lastOutput, undefined);
    });

    it('returns nothing when no block has output', function () {
      const doc = makeDocument([makeCodeElement('el-1')]);

      assert.deepEqual(resetAllOutputs(doc), []);
    });
  });

  describe('setLastOutput', function () {
    it('stores the transcript on the element', function () {
      const doc = makeDocument([makeCodeElement('el-1')]);
      const output = {
        transcript: [{ kind: 'out' as const, text: 'hi' }],
        success: true,
        exitCode: 0,
      };

      setLastOutput(doc, 'el-1', output);

      assert.deepEqual(data(doc, 'el-1').lastOutput, output);
    });
  });

  describe('setOutputCollapsed', function () {
    it('stores a collapse and drops the field again on expand', function () {
      const doc = makeDocument([makeCodeElement('el-1')]);

      assert.equal(setOutputCollapsed(doc, 'el-1', true), true);
      assert.equal(data(doc, 'el-1').outputCollapsed, true);

      assert.equal(setOutputCollapsed(doc, 'el-1', false), true);
      assert.equal('outputCollapsed' in data(doc, 'el-1'), false);
    });

    it('reports no change when the state is already set', function () {
      const doc = makeDocument([makeCodeElement('el-1')]);

      assert.equal(setOutputCollapsed(doc, 'el-1', false), false);
      assert.equal(setOutputCollapsed(doc, 'nope', true), false);
    });
  });

  describe('hasStoredOutputs', function () {
    it('is true once any block has a stored transcript', function () {
      const doc = makeDocument([makeCodeElement('el-1'), makeCodeElement('el-2')]);
      assert.equal(hasStoredOutputs(doc), false);

      data(doc, 'el-2').lastOutput = { transcript: [], success: true, exitCode: 0 };
      assert.equal(hasStoredOutputs(doc), true);
    });
  });
});
