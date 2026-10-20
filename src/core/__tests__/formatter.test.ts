import { describe, it, expect } from 'vitest';
import { parseLooseJSON } from '../parse/parser.ts';
import { formatAST, calculateSizeMetrics } from '../format/formatter.ts';

describe('formatAST', () => {
  it('formats loose JSON to valid strict JSON', () => {
    const input = "{a: 'x', b: [1,2,],}";
    const ast = parseLooseJSON(input);
    const output = formatAST(ast, { indent: '2' });
    expect(JSON.parse(output)).toEqual({ a: 'x', b: [1, 2] });
    expect(output).toContain('"a": "x"');
    expect(output).toContain('"b": [');
  });

  it('preserves lossless big numbers unchanged in output', () => {
    const bigNum = '987654321098765432109876543210';
    const input = `{ id: ${bigNum} }`;
    const ast = parseLooseJSON(input);
    const output = formatAST(ast, { indent: '2' });
    expect(output).toContain(bigNum);
  });

  it('supports indent options: 2, 4, tab, minify', () => {
    const ast = parseLooseJSON('{ a: 1, b: [2] }');

    const out2 = formatAST(ast, { indent: '2' });
    expect(out2).toBe('{\n  "a": 1,\n  "b": [\n    2\n  ]\n}');

    const out4 = formatAST(ast, { indent: '4' });
    expect(out4).toBe('{\n    "a": 1,\n    "b": [\n        2\n    ]\n}');

    const outTab = formatAST(ast, { indent: 'tab' });
    expect(outTab).toBe('{\n\t"a": 1,\n\t"b": [\n\t\t2\n\t]\n}');

    const outMin = formatAST(ast, { indent: 'minify' });
    expect(outMin).toBe('{"a":1,"b":[2]}');
  });

  it('supports recursive sort keys', () => {
    const input = '{ z: 1, a: 2, m: { y: 10, x: 20 } }';
    const ast = parseLooseJSON(input);
    const outSorted = formatAST(ast, { indent: 'minify', sortKeys: true });
    expect(outSorted).toBe('{"a":2,"m":{"x":20,"y":10},"z":1}');
  });

  it('computes accurate size metrics', () => {
    const input = '{\n  "longKey": "value"\n}';
    const output = '{"longKey":"value"}';
    const metrics = calculateSizeMetrics(input, output);
    expect(metrics.inputBytes).toBeGreaterThan(metrics.outputBytes);
    expect(metrics.reductionPercentage).toBeGreaterThan(0);
  });
});
