import { describe, it, expect } from 'vitest';
import { parseLooseJSON } from '../parse/parser.ts';
import { computeSemanticDiff, summarizeDiff, areNumbersEqual } from '../diff/semanticDiff.ts';

describe('Semantic Diff & areNumbersEqual', () => {
  it('correctly compares numbers for decimal equality', () => {
    expect(areNumbersEqual('1', '1.0')).toBe(true);
    expect(areNumbersEqual('1', '1e0')).toBe(true);
    expect(areNumbersEqual('1.0', '1.00')).toBe(true);
    expect(areNumbersEqual('0', '-0')).toBe(true);
    expect(areNumbersEqual('0', '0.0')).toBe(true);
    expect(areNumbersEqual('0.5', '.5')).toBe(true);
    expect(areNumbersEqual('0.5', '5e-1')).toBe(true);
    expect(areNumbersEqual('12345678901234567890', '12345678901234567890')).toBe(true);
    expect(areNumbersEqual('12345678901234567890', '12345678901234567891')).toBe(false);
    expect(areNumbersEqual('10', '12')).toBe(false);
  });

  it('{a: 1} versus {"a": 1,} shows zero differences', () => {
    const left = parseLooseJSON('{a: 1}');
    const right = parseLooseJSON('{"a": 1,}');
    const diff = computeSemanticDiff(left, right);
    expect(diff).toHaveLength(0);
  });

  it('data.items[2].price changing from 10 to 12 shows as one changed row with that exact path', () => {
    const left = parseLooseJSON('{"data": {"items": [1, 2, {"price": 10}]}}');
    const right = parseLooseJSON('{"data": {"items": [1, 2, {"price": 12}]}}');
    const diff = computeSemanticDiff(left, right);
    expect(diff).toHaveLength(1);
    expect(diff[0].type).toBe('changed');
    expect(diff[0].path).toEqual(['data', 'items', 2, 'price']);
    expect(diff[0].oldValue).toBe('10');
    expect(diff[0].newValue).toBe('12');
  });

  it('two different 20-digit integers are reported as changed', () => {
    const left = parseLooseJSON('{ id: 12345678901234567890 }');
    const right = parseLooseJSON('{ id: 12345678901234567891 }');
    const diff = computeSemanticDiff(left, right);
    expect(diff).toHaveLength(1);
    expect(diff[0].type).toBe('changed');
    expect(diff[0].path).toEqual(['id']);
    expect(diff[0].oldValue).toBe('12345678901234567890');
    expect(diff[0].newValue).toBe('12345678901234567891');
  });

  it('detects added and removed properties and summarizes counts', () => {
    const left = parseLooseJSON('{ a: 1, b: 2 }');
    const right = parseLooseJSON('{ b: 2, c: 3 }');
    const diff = computeSemanticDiff(left, right);
    const summary = summarizeDiff(diff);
    expect(summary.removed).toBe(1); // 'a' removed
    expect(summary.added).toBe(1);   // 'c' added
    expect(summary.changed).toBe(0);
    expect(summary.total).toBe(2);
  });
});
