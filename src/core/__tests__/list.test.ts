import { describe, it, expect } from 'vitest';
import { splitLines, formatList } from '../list/formatList.ts';

describe('splitLines', () => {
  it('splits sheet-style columns and trims', () => {
    expect(splitLines('  a \n b\n\nc ', { trim: true, skipEmpty: true, dedupe: false })).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('dedupes when asked', () => {
    expect(splitLines('a\nb\na', { trim: true, skipEmpty: true, dedupe: true })).toEqual([
      'a',
      'b',
    ]);
  });
});

describe('formatList', () => {
  it('joins plain with separator', () => {
    expect(
      formatList(['1', '2', '3'], {
        separator: ', ',
        quote: 'none',
        wrapper: 'none',
        trim: true,
        skipEmpty: true,
        dedupe: false,
      })
    ).toBe('1, 2, 3');
  });

  it('applies single quotes and parens wrapper', () => {
    expect(
      formatList(['1', '2'], {
        separator: ', ',
        quote: 'single',
        wrapper: 'parens',
        trim: true,
        skipEmpty: true,
        dedupe: false,
      })
    ).toBe("('1', '2')");
  });

  it('escapes quotes inside values', () => {
    expect(
      formatList(["o'brien"], {
        separator: ', ',
        quote: 'single',
        wrapper: 'none',
        trim: true,
        skipEmpty: true,
        dedupe: false,
      })
    ).toBe("'o''brien'");
  });
});
