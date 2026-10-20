import { describe, it, expect } from 'vitest';
import { repairAndParseJSON } from '../repair/repair.ts';
import { formatAST } from '../format/formatter.ts';

describe('Smart Format / Repair Mode', () => {
  it('repairs missing commas between object properties', () => {
    const broken = `
      {
        "a": 1
        "b": 2
        "c": 3
      }
    `;
    const res = repairAndParseJSON(broken);
    const out = formatAST(res.ast, { indent: 'minify' });
    expect(out).toBe('{"a":1,"b":2,"c":3}');
    expect(res.report.some(r => r.message.includes('missing comma'))).toBe(true);
  });

  it('repairs missing commas between array elements', () => {
    const broken = `
      [
        1
        2
        3
      ]
    `;
    const res = repairAndParseJSON(broken);
    const out = formatAST(res.ast, { indent: 'minify' });
    expect(out).toBe('[1,2,3]');
  });

  it('repairs unclosed objects and arrays at end of input (truncated payloads)', () => {
    const truncated = '{"user": {"id": 123, "tags": ["admin", "dev"';
    const res = repairAndParseJSON(truncated);
    const out = formatAST(res.ast, { indent: 'minify' });
    expect(out).toBe('{"user":{"id":123,"tags":["admin","dev"]}}');
    expect(res.hasTruncation).toBe(true);
    expect(res.report.some(r => r.severity === 'warning')).toBe(true);
  });

  it('repairs unclosed string at end of input', () => {
    const truncated = '{"message": "Hello world';
    const res = repairAndParseJSON(truncated);
    const out = formatAST(res.ast, { indent: 'minify' });
    expect(out).toBe('{"message":"Hello world"}');
    expect(res.hasTruncation).toBe(true);
  });

  it('ignores trailing text after root value and logs it', () => {
    const input = '{"status": "ok"} Extra random characters here...';
    const res = repairAndParseJSON(input);
    const out = formatAST(res.ast, { indent: 'minify' });
    expect(out).toBe('{"status":"ok"}');
    expect(res.report.some(r => r.message.includes('trailing text'))).toBe(true);
  });

  it('normalizes curly quotes copied from docs or chat', () => {
    const input = '“title”: ‘Developer Guide’, “count”: 5';
    // Inside an object:
    const objectInput = `{ ${input} }`;
    const res = repairAndParseJSON(objectInput);
    const out = formatAST(res.ast, { indent: 'minify' });
    expect(out).toBe('{"title":"Developer Guide","count":5}');
    expect(res.report.some(r => r.message.includes('curly'))).toBe(true);
  });

  it('refuses ambiguous input and throws ParseError', () => {
    expect(() => repairAndParseJSON('   ')).toThrow();
  });
});
