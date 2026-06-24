import { strict as assert } from 'assert';
import { JavaCodeblockRunner } from '../runner/JavaCodeblockRunner';

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

  it('executes a java class with main method when tools are available', async function () {
    const toolCheck = await runner.checkTools();
    if (!toolCheck.available) {
      this.skip();
    }

    const source = {
      name: 'Hello.java',
      language: 'java' as const,
      code: 'public class Hello { public static void main(String[] args) { System.out.println("hello from 5board"); } }',
      createdAt: 0,
      modifiedAt: 0,
    };

    const result = await runner.execute({
      language: 'java',
      fileName: 'Hello.java',
      sources: [source],
    });

    assert.equal(result.success, true);
    assert.ok(result.stdout.includes('hello from 5board'));
  });
});
