import { strict as assert } from 'assert';
import {
  BoardElement,
  EditorElementType,
  HeadingLevel,
  computeHeadingNumbers,
} from '5board.vsc-common';

describe('computeHeadingNumbers', function () {
  it('uses decimal numbering by default', function () {
    const numbers = computeHeadingNumbers([
      heading('a', 1, 20),
      heading('b', 2, 40),
      heading('c', 2, 60),
      heading('d', 1, 80),
    ]);

    assert.equal(numbers.get('a'), '1');
    assert.equal(numbers.get('b'), '1.1');
    assert.equal(numbers.get('c'), '1.2');
    assert.equal(numbers.get('d'), '2');
  });

  it('returns no prefixes when numbering is disabled', function () {
    const numbers = computeHeadingNumbers([heading('a', 1, 20)], {
      numberingFormat: 'none',
    });

    assert.equal(numbers.size, 0);
  });

  it('formats lowercase alphabetic numbers', function () {
    const numbers = computeHeadingNumbers(
      Array.from({ length: 27 }, (_, index) => heading(`h${index}`, 1, index)),
      { numberingFormat: 'lower-alpha' },
    );

    assert.equal(numbers.get('h0'), 'a');
    assert.equal(numbers.get('h25'), 'z');
    assert.equal(numbers.get('h26'), 'aa');
  });

  it('formats uppercase alphabetic numbers', function () {
    const numbers = computeHeadingNumbers([heading('a', 1, 20), heading('b', 2, 40)], {
      numberingFormat: 'upper-alpha',
    });

    assert.equal(numbers.get('a'), 'A');
    assert.equal(numbers.get('b'), 'A.A');
  });

  it('formats lowercase roman numbers', function () {
    const numbers = computeHeadingNumbers([heading('a', 1, 20), heading('b', 2, 40)], {
      numberingFormat: 'lower-roman',
    });

    assert.equal(numbers.get('a'), 'i');
    assert.equal(numbers.get('b'), 'i.i');
  });

  it('formats uppercase roman numbers', function () {
    const numbers = computeHeadingNumbers(
      Array.from({ length: 4 }, (_, index) => heading(`h${index}`, 1, index)),
      { numberingFormat: 'upper-roman' },
    );

    assert.equal(numbers.get('h0'), 'I');
    assert.equal(numbers.get('h3'), 'IV');
  });

  it('ignores hidden headings', function () {
    const numbers = computeHeadingNumbers([
      heading('hidden', 1, 20, 0, false),
      heading('visible', 1, 40),
    ]);

    assert.equal(numbers.has('hidden'), false);
    assert.equal(numbers.get('visible'), '1');
  });

  it('resets deeper counters after switching to a higher level', function () {
    const numbers = computeHeadingNumbers([
      heading('h1', 1, 10),
      heading('h2a', 2, 20),
      heading('h3a', 3, 30),
      heading('h2b', 2, 40),
      heading('h3b', 3, 50),
    ]);

    assert.equal(numbers.get('h3a'), '1.1.1');
    assert.equal(numbers.get('h2b'), '1.2');
    assert.equal(numbers.get('h3b'), '1.2.1');
  });
});

function heading(
  id: string,
  level: HeadingLevel,
  yPos: number,
  xPos = 0,
  visible = true,
): BoardElement {
  return {
    id,
    type: EditorElementType.Heading,
    layout: {
      xPos,
      yPos,
      width: 1,
      height: 1,
    },
    style: {
      visible,
    },
    data: {
      level,
      content: id,
    },
  };
}
