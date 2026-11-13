import { describe, it, expect } from 'vitest';
import {
  detectDelimiter, toTable, stringifyCsv, transpose, toMarkdownTable, toSqlInserts, toObjects,
  sortRows, filterRows, columnStats, csvDiff,
} from '../csv/csv.ts';

const t = (s: string) => toTable(s, ',', true);

describe('csv core', () => {
  it('detects delimiters', () => {
    expect(detectDelimiter('a,b,c\n1,2,3')).toBe(',');
    expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';');
    expect(detectDelimiter('a\tb\n1\t2')).toBe('\t');
    expect(detectDelimiter('"a,b"|c\n"x,y"|z')).toBe('|');
  });
  it('builds table with header, padding and default names', () => {
    expect(t('a,b\n1')).toEqual({ header: ['a', 'b'], rows: [['1', '']] });
    expect(toTable('1,2\n3,4', ',', false).header).toEqual(['column_1', 'column_2']);
    expect(t('').header).toEqual([]);
  });
  it('round-trips through stringify with quoting', () => {
    const tb = t('a,b\n"x,1","he said ""hi"""');
    expect(stringifyCsv(tb)).toBe('a,b\n"x,1","he said ""hi"""');
    expect(stringifyCsv(tb, ';', false)).toBe('x,1;"he said ""hi"""');
  });
  it('transposes', () => {
    expect(transpose(t('a,b\n1,2\n3,4'))).toEqual({ header: ['a', '1', '3'], rows: [['b', '2', '4']] });
  });
  it('exports markdown, sql, objects', () => {
    const tb = t("name,age\nBob,30\nO'Neil,");
    expect(toMarkdownTable(tb).split('\n')[1]).toMatch(/^\| -+ \| -+ \|$/);
    expect(toSqlInserts(tb, 'p').split('\n')[1]).toBe("INSERT INTO `p` (`name`, `age`) VALUES ('O''Neil', NULL);");
    expect(toObjects(tb)).toEqual([{ name: 'Bob', age: 30 }, { name: "O'Neil", age: null }]);
  });
  it('sorts numerically and filters', () => {
    const rows = t('n\n10\n9\n100').rows;
    expect(sortRows(rows, 0, 'asc').map((r) => r[0])).toEqual(['9', '10', '100']);
    expect(sortRows(rows, 0, 'desc').map((r) => r[0])).toEqual(['100', '10', '9']);
    expect(filterRows(t('a,b\nfoo,1\nbar,2').rows, 'FOO')).toHaveLength(1);
    expect(filterRows(t('a,b\nfoo,1\nbar,foo').rows, 'foo', 1)).toHaveLength(1);
  });
  it('column stats', () => {
    const s = columnStats(t('n,m\n1,x\n3,x\n,x\n3,x').rows, 0);
    expect(s).toMatchObject({ count: 4, empty: 1, unique: 2, numeric: true, min: 1, max: 3, sum: 7 });
    expect(s.top[0]).toEqual(['3', 2]);
  });
});

describe('csv diff', () => {
  const opts = { key: 'id', trim: true, ignoreCase: false };
  it('matches by key and finds added/removed/changed', () => {
    const a = t('id,name,age\n1,Ann,30\n2,Bob,40\n3,Cy,50');
    const b = t('id,name,age\n1,Ann,30\n2,Bobby,40\n4,Di,20');
    const d = csvDiff(a, b, opts);
    expect(d.counts).toEqual({ added: 1, removed: 1, changed: 1, same: 1 });
    expect(d.rows.find((r) => r.key === '2')!.changed).toEqual(['name']);
  });
  it('handles columns added/removed and duplicate keys', () => {
    const d = csvDiff(t('id,x\n1,a\n1,b'), t('id,y\n1,a\n1,b'), opts);
    expect(d.columnsAdded).toEqual(['y']);
    expect(d.columnsRemoved).toEqual(['x']);
    expect(d.rows.map((r) => r.key)).toEqual(['1', '1#2']);
  });
  it('pairs by position without key and respects ignore options', () => {
    const d = csvDiff(t('a\nX \nq'), t('a\nx\nq\nz'), { key: null, trim: true, ignoreCase: true });
    expect(d.counts).toEqual({ added: 1, removed: 0, changed: 0, same: 2 });
  });
});
