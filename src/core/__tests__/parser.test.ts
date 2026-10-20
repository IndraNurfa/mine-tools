import { describe, it, expect } from 'vitest';
import { parseLooseJSON } from '../parse/parser.ts';
import { ParseError, ObjectNode, ArrayNode, NumberNode, StringNode } from '../parse/types.ts';

describe('LooseJSONParser', () => {
  it('parses strict standard JSON', () => {
    const input = '{"name": "Toolbox", "count": 42, "active": true, "extra": null}';
    const ast = parseLooseJSON(input) as ObjectNode;
    expect(ast.type).toBe('object');
    expect(ast.children).toHaveLength(4);
    expect(ast.children[0].key).toBe('name');
    expect((ast.children[0].value as StringNode).value).toBe('Toolbox');
    expect((ast.children[1].value as NumberNode).raw).toBe('42');
  });

  it('parses unquoted and single-quoted keys', () => {
    const input = '{ unquotedKey: 1, \'singleQuoted\': 2, "doubleQuoted": 3, $money: 4, _private: 5 }';
    const ast = parseLooseJSON(input) as ObjectNode;
    expect(ast.children.map(c => c.key)).toEqual([
      'unquotedKey',
      'singleQuoted',
      'doubleQuoted',
      '$money',
      '_private'
    ]);
  });

  it('parses single-quoted strings with escapes', () => {
    const input = "{ message: 'It\\'s a test\\nwith escaped \\'quotes\\'' }";
    const ast = parseLooseJSON(input) as ObjectNode;
    expect((ast.children[0].value as StringNode).value).toBe("It's a test\nwith escaped 'quotes'");
  });

  it('parses trailing commas in objects and arrays', () => {
    const input = '{ a: [1, 2, 3,], b: { x: 10, y: 20, }, }';
    const ast = parseLooseJSON(input) as ObjectNode;
    const aVal = ast.children[0].value as ArrayNode;
    expect(aVal.children).toHaveLength(3);
    const bVal = ast.children[1].value as ObjectNode;
    expect(bVal.children).toHaveLength(2);
  });

  it('ignores line comments and block comments', () => {
    const input = `
      // Top comment
      {
        /* block comment */
        a: 1, // inline comment
        /* multi
           line
           comment */
        b: 2
      }
    `;
    const ast = parseLooseJSON(input) as ObjectNode;
    expect(ast.children).toHaveLength(2);
    expect(ast.children[0].key).toBe('a');
    expect(ast.children[1].key).toBe('b');
  });

  it('preserves lossless big numbers without passing through JS Number', () => {
    const bigIntStr = '123456789012345678901234567890';
    const input = `{ id: ${bigIntStr} }`;
    const ast = parseLooseJSON(input) as ObjectNode;
    const numNode = ast.children[0].value as NumberNode;
    expect(numNode.raw).toBe(bigIntStr);
    expect(numNode.normalized).toBe(bigIntStr);
  });

  it('parses loose numbers: leading +, leading dot, trailing dot, hex', () => {
    const input = '{ positive: +42, leadDot: .5, trailDot: 5., hex: 0xFF, negHex: -0x10 }';
    const ast = parseLooseJSON(input) as ObjectNode;
    const map = new Map(ast.children.map(c => [c.key, c.value as NumberNode]));

    expect(map.get('positive')?.raw).toBe('+42');
    expect(map.get('positive')?.normalized).toBe('42');

    expect(map.get('leadDot')?.raw).toBe('.5');
    expect(map.get('leadDot')?.normalized).toBe('0.5');

    expect(map.get('trailDot')?.raw).toBe('5.');
    expect(map.get('trailDot')?.normalized).toBe('5');

    expect(map.get('hex')?.raw).toBe('0xFF');
    expect(map.get('hex')?.normalized).toBe('255');

    expect(map.get('negHex')?.raw).toBe('-0x10');
    expect(map.get('negHex')?.normalized).toBe('-16');
  });

  it('rejects forbidden literals with clear line and column: NaN, Infinity, undefined, Python literals', () => {
    expect(() => parseLooseJSON('{ a: NaN }')).toThrow(ParseError);
    expect(() => parseLooseJSON('{ a: Infinity }')).toThrow(ParseError);
    expect(() => parseLooseJSON('{ a: undefined }')).toThrow(ParseError);
    expect(() => parseLooseJSON('{ a: None }')).toThrow(ParseError);
    expect(() => parseLooseJSON('{ a: True }')).toThrow(ParseError);
    expect(() => parseLooseJSON('{ a: False }')).toThrow(ParseError);

    try {
      parseLooseJSON('\n\n  { val: None }');
    } catch (e: any) {
      expect(e).toBeInstanceOf(ParseError);
      expect(e.line).toBe(3);
      expect(e.column).toBe(10);
      expect(e.message).toContain("Unsupported Python literal 'None'");
    }
  });

  it('tracks accurate source locations and offsets for AST nodes', () => {
    const input = '{\n  key: 123\n}';
    const ast = parseLooseJSON(input) as ObjectNode;
    expect(ast.start.line).toBe(1);
    expect(ast.start.column).toBe(1);
    expect(ast.children[0].key).toBe('key');
    expect(ast.children[0].keyStart.line).toBe(2);
    expect(ast.children[0].keyStart.column).toBe(3);
  });
});
