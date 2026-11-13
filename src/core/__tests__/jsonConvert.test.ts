import { describe, it, expect } from 'vitest';
import { parseLooseJSON } from '../parse/parser.ts';
import { astToValue, toYaml, toCsv, toTypeScript } from '../convert/jsonConvert.ts';

const v = (s: string) => astToValue(parseLooseJSON(s));

describe('json convert', () => {
  it('yaml basic structures', () => {
    expect(toYaml(v('{a: 1, b: [1, 2], c: {d: "x y"}, e: "true", f: null}'))).toBe(
      ['a: 1', 'b:', '  - 1', '  - 2', 'c:', '  d: x y', 'e: "true"', 'f: null'].join('\n'),
    );
  });
  it('yaml array of objects', () => {
    expect(toYaml(v('[{a:1,b:2},{a:3}]'))).toBe('- a: 1\n  b: 2\n- a: 3');
  });
  it('yaml preserves big ints and empty containers', () => {
    expect(toYaml(v('{n: 12345678901234567890, e: [], o: {}}'))).toBe(
      'n: 12345678901234567890\ne: []\no: {}',
    );
  });
  it('csv flattens and unions columns', () => {
    expect(toCsv(v('[{a:1,b:{c:"x,y"}},{a:2,d:true}]'))).toBe('a,b.c,d\n1,"x,y",\n2,,true');
  });
  it('typescript infers interfaces with optionals and unions', () => {
    const ts = toTypeScript(v('{id: 1, tags: ["a"], user: {name: "n"}, items: [{x: 1}, {x: 2, y: "s"}], v: [1, "a"]}'));
    expect(ts).toContain('export interface Root');
    expect(ts).toContain('id: number;');
    expect(ts).toContain('tags: string[];');
    expect(ts).toContain('user: User;');
    expect(ts).toContain('y?: string;');
    expect(ts).toContain('v: (number | string)[];');
  });
  it('typescript for top-level array', () => {
    expect(toTypeScript(v('[1,2]'))).toBe('export type Root = number[];');
  });
});
