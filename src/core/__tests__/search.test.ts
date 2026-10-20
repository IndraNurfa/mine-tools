import { describe, it, expect } from 'vitest';
import { parseLooseJSON } from '../parse/parser.ts';
import { searchAST } from '../search/search.ts';

describe('searchAST', () => {
  const jsonText = `
    {
      "price": 100,
      "items": [
        { "name": "Apple", "price": 10 },
        { "name": "Banana", "price": 20 }
      ],
      "bigNumber": 12345678901234567890,
      "description": "best price in town"
    }
  `;
  const ast = parseLooseJSON(jsonText);

  it('searches keys only', () => {
    const res = searchAST(ast, { query: 'price', scope: 'keys' });
    // 'price' root, 'price' in items[0], 'price' in items[1]
    expect(res.matches.every(m => m.target === 'key')).toBe(true);
    expect(res.matches.length).toBe(3);
  });

  it('searches values only', () => {
    const res = searchAST(ast, { query: 'price', scope: 'values' });
    // 'description' value contains "best price in town"
    expect(res.matches.every(m => m.target === 'value')).toBe(true);
    expect(res.matches.length).toBe(1);
    expect(res.matches[0].path).toEqual(['description']);
  });

  it('searches both keys and values', () => {
    const res = searchAST(ast, { query: 'price', scope: 'both' });
    expect(res.matches.length).toBe(4);
  });

  it('matches raw number text exactly for big numbers', () => {
    const res = searchAST(ast, { query: '12345678901234567890', scope: 'values' });
    expect(res.matches.length).toBe(1);
    expect(res.matches[0].path).toEqual(['bigNumber']);
  });

  it('handles case-sensitivity toggle', () => {
    const sensitive = searchAST(ast, { query: 'Apple', matchCase: true });
    expect(sensitive.matches.length).toBe(1);

    const sensitiveMiss = searchAST(ast, { query: 'apple', matchCase: true });
    expect(sensitiveMiss.matches.length).toBe(0);

    const insensitive = searchAST(ast, { query: 'apple', matchCase: false });
    expect(insensitive.matches.length).toBe(1);
  });

  it('supports regex search', () => {
    const regRes = searchAST(ast, { query: '^B.*a$', useRegex: true });
    expect(regRes.matches.length).toBe(1);
    expect(regRes.matches[0].text).toBe('Banana');
  });

  it('caps matches at maxMatches and sets isCapped', () => {
    const largeArray = Array.from({ length: 50 }, (_, i) => ({ id: i }));
    const largeAst = parseLooseJSON(JSON.stringify(largeArray));
    const cappedRes = searchAST(largeAst, { query: 'id', scope: 'keys', maxMatches: 10 });
    expect(cappedRes.matches.length).toBe(10);
    expect(cappedRes.isCapped).toBe(true);
  });
});
