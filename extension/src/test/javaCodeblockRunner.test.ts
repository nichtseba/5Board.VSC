import { strict as assert } from 'assert';
import { JavaCodeblockRunner } from '../runner/JavaCodeblockRunner.js';

describe('JavaCodeblockRunner', function () {
  const runner = new JavaCodeblockRunner();

  it('handles java language', function () {
    assert.equal(runner.canHandle('java'), true);
  });

  it('handles false language', function () {
    assert.equal(runner.canHandle('javascript'), false);
  });

  it('checks java tool availability', async function () {
    const result = await runner.checkTools();
    assert.equal(typeof result.available, 'boolean');
  });

  it('executes a simple java snippet when tools are available', async function () {
    const toolCheck = await runner.checkTools();
    if (!toolCheck.available) {
      this.skip();
    }

    const request = {
      id: 'test-execution',
      language: 'java' as const,
      code: 'System.out.println("hello from 5board");',
    };

    const result = await runner.execute(request);
    assert.equal(result.success, true);
    assert.ok(result.stdout.includes('hello from 5board'));
  });
});
