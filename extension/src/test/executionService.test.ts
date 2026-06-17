import { strict as assert } from 'assert';
import { ExecutionService } from '../runner/ExecutionService';
import { BoardDocument, EditorElementType } from '5board.vsc-common';
import type { EditorElement, CodeElementData } from '5board.vsc-common';

const service = new ExecutionService();

function makeDocument(overrides: Partial<BoardDocument> = {}): BoardDocument {
  return {
    manifest: { title: 'test', createdAt: '', modifiedAt: '', version: '1' },
    content: { elements: [] },
    sources: [],
    assets: [],
    ...overrides,
  };
}

function makeCodeElement(
  data: Partial<CodeElementData> = {},
): EditorElement<EditorElementType.Code> {
  const elementData: CodeElementData = {
    codeBlockId: data.codeBlockId ?? 'block-1',
    fileName: data.fileName ?? 'Main.java',
    language: data.language ?? 'java',
    content: data.content ?? '',
    output: data.output,
  };
  return {
    id: 'element-1',
    type: EditorElementType.Code,
    layout: { xPos: 0, yPos: 0, width: 100, height: 100 },
    style: { visible: true },
    data: elementData,
  };
}

describe('ExecutionService', function () {
  it('returns error for non-existent element id', async function () {
    const result = await service.execute(makeDocument(), 'does-not-exist');
    assert.equal(result.success, false);
    assert.ok(result.error?.includes('does-not-exist'));
  });

  it('returns error when source file not in document', async function () {
    const doc = makeDocument({
      content: { elements: [makeCodeElement({ fileName: 'Student.java', language: 'java' })] },
      sources: [],
    });
    const result = await service.execute(doc, 'element-1');
    assert.equal(result.success, false);
    assert.ok(result.error?.includes('Student.java'));
  });

  it('returns error when language has no runner', async function () {
    const doc = makeDocument({
      content: { elements: [makeCodeElement({ fileName: 'script.rb', language: 'ruby' })] },
      sources: [{ name: 'script.rb', language: 'ruby', code: 'puts "hello"' }],
    });
    const result = await service.execute(doc, 'element-1');
    assert.equal(result.success, false);
    assert.ok(result.error?.includes('ruby'));
  });
});
