import { describe, it, expect } from 'vitest';
import { convertCase, splitWords, convertCaseLines } from '../text/caseConvert.ts';
import { processLines } from '../text/lineTools.ts';
import { runRegex, runReplace } from '../regex/regexTest.ts';

describe('case convert', () => {
  it('splits mixed identifiers', () => {
    expect(splitWords('parseHTTPResponse_v2-final')).toEqual(['parse', 'http', 'response', 'v2', 'final']);
  });
  it('converts styles', () => {
    expect(convertCase('hello big world', 'camel')).toBe('helloBigWorld');
    expect(convertCase('hello big world', 'pascal')).toBe('HelloBigWorld');
    expect(convertCase('helloBigWorld', 'snake')).toBe('hello_big_world');
    expect(convertCase('helloBigWorld', 'constant')).toBe('HELLO_BIG_WORLD');
    expect(convertCase('helloBigWorld', 'kebab')).toBe('hello-big-world');
    expect(convertCase('hello big world', 'title')).toBe('Hello Big World');
    expect(convertCase('hello big world', 'sentence')).toBe('Hello big world');
  });
  it('per-line keeps blank lines', () => {
    expect(convertCaseLines('a b\n\nc d', 'snake')).toBe('a_b\n\nc_d');
  });
});

describe('line tools', () => {
  const base = { sort: 'none', dedupe: false, trim: false, removeEmpty: false, caseInsensitive: false } as const;
  it('sorts, dedupes, trims', () => {
    expect(processLines('b\na\nb', { ...base, sort: 'asc', dedupe: true })).toEqual(['a', 'b']);
    expect(processLines(' x \n\ny', { ...base, trim: true, removeEmpty: true })).toEqual(['x', 'y']);
  });
  it('natural sort and case-insensitive dedupe', () => {
    expect(processLines('f10\nf2\nf1', { ...base, sort: 'natural' })).toEqual(['f1', 'f2', 'f10']);
    expect(processLines('A\na', { ...base, dedupe: true, caseInsensitive: true })).toEqual(['A']);
  });
  it('reverse and length', () => {
    expect(processLines('a\nb\nc', { ...base, sort: 'reverse' })).toEqual(['c', 'b', 'a']);
    expect(processLines('ccc\na\nbb', { ...base, sort: 'length' })).toEqual(['a', 'bb', 'ccc']);
  });
});

describe('regex tester', () => {
  it('finds matches with groups', () => {
    const r = runRegex('(?<k>\\w+)=(\\d+)', 'g', 'a=1, b=22');
    expect(r.matches).toHaveLength(2);
    expect(r.matches[1]!.groups).toEqual(['b', '22']);
    expect(r.matches[1]!.named.k).toBe('b');
  });
  it('reports invalid patterns and handles zero-length matches', () => {
    expect(runRegex('(', '', 'x').error).toBeTruthy();
    expect(runRegex('x*', 'g', 'abc').matches.length).toBeGreaterThan(0);
  });
  it('replace', () => {
    expect(runReplace('(\\w)(\\d)', 'g', 'a1 b2', '$2$1')).toBe('1a 2b');
  });
});
