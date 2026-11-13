import { describe, it, expect } from 'vitest';
import { parseColor, toHex, toRgbString, toHslString, contrastRatio } from '../color/color.ts';
import { parseUrl, withParams } from '../url/url.ts';
import { octalToPerms, permsToOctal, permsToSymbolic, symbolicToPerms } from '../chmod/chmod.ts';
import { generatePassword, entropyBits, randomInt, shuffle } from '../random/random.ts';
import { generateLorem } from '../lorem/lorem.ts';
import { convertBase, toBytes, fromBytes } from '../numbers/numbers.ts';
import { diffDates, addToDate, parseDateInput, isoWeek, dayOfYear } from '../time/dateCalc.ts';
import { searchStatus } from '../http/statusCodes.ts';
import { jsonEscape, jsonUnescape, unicodeEscape, unicodeUnescape } from '../encode/encode.ts';
import { csvToJson, parseCsv } from '../convert/jsonConvert.ts';

describe('color', () => {
  it('parses and converts', () => {
    const c = parseColor('#00d992')!;
    expect(c).toEqual({ r: 0, g: 217, b: 146, a: 1 });
    expect(toHex(c)).toBe('#00d992');
    expect(toRgbString(c)).toBe('rgb(0, 217, 146)');
    expect(toHslString(c)).toBe('hsl(160, 100%, 43%)');
    expect(parseColor('hsl(0, 100%, 50%)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor('rgba(10,20,30,0.5)')).toEqual({ r: 10, g: 20, b: 30, a: 0.5 });
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor('nope')).toBeNull();
  });
  it('contrast', () => {
    expect(contrastRatio(parseColor('#000')!, parseColor('#fff')!)).toBeCloseTo(21, 0);
  });
});

describe('url', () => {
  it('parses with and without scheme', () => {
    const u = parseUrl('example.com:8080/a/b?x=1&y=two%20words#frag');
    expect(u.hostname).toBe('example.com');
    expect(u.port).toBe('8080');
    expect(u.params).toEqual([['x', '1'], ['y', 'two words']]);
    expect(u.hash).toBe('#frag');
    expect(() => parseUrl('')).toThrow();
  });
  it('rebuilds params', () => {
    expect(withParams('https://a.com/p?old=1', [['a', 'b c'], ['', 'x']])).toBe('https://a.com/p?a=b+c');
  });
});

describe('chmod', () => {
  it('round trips', () => {
    const p = octalToPerms('754')!;
    expect(permsToSymbolic(p)).toBe('rwxr-xr--');
    expect(permsToOctal(symbolicToPerms('-rwxr-xr--')!)).toBe('754');
    expect(octalToPerms('999')).toBeNull();
    expect(octalToPerms('0644')).not.toBeNull();
  });
});

describe('random', () => {
  const o = { length: 24, lower: true, upper: true, digits: true, symbols: true, noAmbiguous: false };
  it('password has requested length and every class', () => {
    for (let i = 0; i < 20; i++) {
      const p = generatePassword(o);
      expect(p).toHaveLength(24);
      expect(p).toMatch(/[a-z]/);
      expect(p).toMatch(/[A-Z]/);
      expect(p).toMatch(/\d/);
      expect(p).toMatch(/[^A-Za-z0-9]/);
    }
  });
  it('avoids ambiguous chars and reports entropy', () => {
    expect(generatePassword({ ...o, symbols: false, noAmbiguous: true, length: 200 })).not.toMatch(/[O0oIl1]/);
    expect(entropyBits({ ...o, symbols: false, upper: false, digits: false, length: 10 })).toBe(47);
    expect(generatePassword({ ...o, lower: false, upper: false, digits: false, symbols: false })).toBe('');
  });
  it('randomInt in range and shuffle keeps elements', () => {
    for (let i = 0; i < 200; i++) expect([1, 2, 3]).toContain(randomInt(1, 3));
    expect(shuffle([1, 2, 3, 4]).sort()).toEqual([1, 2, 3, 4]);
  });
});

describe('lorem', () => {
  it('counts units', () => {
    expect(generateLorem('words', 7, true, 1).split(' ')).toHaveLength(7);
    expect(generateLorem('words', 5, true, 1)).toBe('lorem ipsum dolor sit amet');
    expect(generateLorem('paragraphs', 3, true, 1).split('\n\n')).toHaveLength(3);
    expect(generateLorem('sentences', 4, true, 1).match(/\./g)).toHaveLength(4);
  });
});

describe('numbers', () => {
  it('converts bases incl. big values', () => {
    expect(convertBase('255', 10, 16)).toBe('ff');
    expect(convertBase('0xFF', 16, 2)).toBe('11111111');
    expect(convertBase('-10', 10, 2)).toBe('-1010');
    expect(convertBase('18446744073709551616', 10, 16)).toBe('10000000000000000');
    expect(() => convertBase('2', 2, 10)).toThrow();
  });
  it('bytes', () => {
    expect(toBytes(1, 'KiB')).toBe(1024);
    expect(toBytes(1, 'KB')).toBe(1000);
    expect(fromBytes(1_000_000, 'MB')).toBe(1);
  });
});

describe('date calc', () => {
  it('diffs', () => {
    const d = diffDates(parseDateInput('2024-01-31')!, parseDateInput('2024-03-01')!);
    expect(d).toMatchObject({ years: 0, months: 1, days: 1, totalDays: 30, negative: false });
    expect(diffDates(parseDateInput('2024-03-01')!, parseDateInput('2024-01-31')!).negative).toBe(true);
  });
  it('adds with month clamping', () => {
    const r = addToDate(parseDateInput('2024-01-31')!, { months: 1 });
    expect([r.getMonth(), r.getDate()]).toEqual([1, 29]);
    const w = addToDate(parseDateInput('2024-12-25')!, { weeks: 1, days: 1 });
    expect([w.getMonth(), w.getDate()]).toEqual([0, 2]);
  });
  it('week numbers', () => {
    expect(isoWeek(parseDateInput('2024-01-01')!)).toBe(1);
    expect(isoWeek(parseDateInput('2021-01-03')!)).toBe(53);
    expect(dayOfYear(parseDateInput('2024-03-01')!)).toBe(61);
  });
});

describe('http status', () => {
  it('searches by code, name and class', () => {
    expect(searchStatus('404')[0]!.name).toBe('Not Found');
    expect(searchStatus('teapot')[0]!.code).toBe(418);
    expect(searchStatus('5xx').every((s) => s.code >= 500)).toBe(true);
  });
});

describe('escapes', () => {
  it('json escape', () => {
    expect(jsonEscape('a "b"\n\tc')).toBe('a \\"b\\"\\n\\tc');
    expect(jsonUnescape('a \\"b\\"\\n')).toBe('a "b"\n');
    expect(jsonUnescape('"quoted\\n"')).toBe('quoted\n');
  });
  it('unicode escape', () => {
    expect(unicodeEscape('aé🚀')).toBe('a\\u00e9\\ud83d\\ude80');
    expect(unicodeUnescape('a\\u00e9\\ud83d\\ude80 \\u{1F680}')).toBe('aé🚀 🚀');
  });
});

describe('csv', () => {
  it('parses quotes, escapes, CRLF', () => {
    expect(parseCsv('a,b\r\n"x,1","he said ""hi"""\n')).toEqual([['a', 'b'], ['x,1', 'he said "hi"']]);
  });
  it('to json with inference', () => {
    expect(JSON.parse(csvToJson('n,ok,s,e\n1,true,x,', { infer: true }))).toEqual([{ n: 1, ok: true, s: 'x', e: null }]);
    expect(JSON.parse(csvToJson('n\n1'))).toEqual([{ n: '1' }]);
  });
});
