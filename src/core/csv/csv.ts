import { parseCsv } from '../convert/jsonConvert.ts';

export { parseCsv };

export interface CsvTable {
  header: string[];
  rows: string[][];
}

export const DELIMITERS = [
  { id: 'auto', label: 'Auto', char: '' },
  { id: ',', label: 'Comma', char: ',' },
  { id: ';', label: 'Semicolon', char: ';' },
  { id: '\t', label: 'Tab', char: '\t' },
  { id: '|', label: 'Pipe', char: '|' },
] as const;

/** Pick the delimiter that appears most consistently (outside quotes) in the first lines. */
export function detectDelimiter(text: string): string {
  const lines: string[] = [];
  let cur = '';
  let q = false;
  for (const c of text) {
    if (c === '"') q = !q;
    if ((c === '\n') && !q) {
      lines.push(cur);
      cur = '';
      if (lines.length >= 8) break;
    } else cur += c;
  }
  if (cur && lines.length < 8) lines.push(cur);
  let best = ',';
  let bestScore = 0;
  for (const d of [',', ';', '\t', '|']) {
    const counts = lines.map((l) => {
      let n = 0;
      let inQ = false;
      for (const c of l) {
        if (c === '"') inQ = !inQ;
        else if (c === d && !inQ) n++;
      }
      return n;
    });
    const first = counts[0] ?? 0;
    if (first === 0) continue;
    const consistent = counts.filter((n) => n === first).length;
    const score = first * consistent;
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

export function toTable(text: string, delimiter: string, hasHeader: boolean): CsvTable {
  const raw = parseCsv(text, delimiter);
  if (!raw.length) return { header: [], rows: [] };
  const width = Math.max(...raw.map((r) => r.length));
  const pad = (r: string[]) => (r.length < width ? [...r, ...Array(width - r.length).fill('')] : r);
  if (hasHeader) {
    const header = pad(raw[0]!).map((h, i) => h.trim() || `column_${i + 1}`);
    return { header, rows: raw.slice(1).map(pad) };
  }
  return { header: Array.from({ length: width }, (_, i) => `column_${i + 1}`), rows: raw.map(pad) };
}

const csvCell = (v: string, d: string) =>
  v.includes(d) || /["\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;

export function stringifyCsv(t: CsvTable, delimiter = ',', withHeader = true): string {
  const all = withHeader ? [t.header, ...t.rows] : t.rows;
  return all.map((r) => r.map((c) => csvCell(c, delimiter)).join(delimiter)).join('\n');
}

export function transpose(t: CsvTable): CsvTable {
  const all = [t.header, ...t.rows];
  const width = Math.max(0, ...all.map((r) => r.length));
  const flipped = Array.from({ length: width }, (_, c) => all.map((r) => r[c] ?? ''));
  return { header: flipped[0] ?? [], rows: flipped.slice(1) };
}

export function toMarkdownTable(t: CsvTable): string {
  const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
  const w = t.header.map((h, i) => Math.max(3, esc(h).length, ...t.rows.map((r) => esc(r[i] ?? '').length)));
  const line = (cells: string[]) => '| ' + cells.map((c, i) => esc(c).padEnd(w[i]!)).join(' | ') + ' |';
  return [line(t.header), '| ' + w.map((n) => '-'.repeat(n)).join(' | ') + ' |', ...t.rows.map(line)].join('\n');
}

const isNumeric = (s: string) => /^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s.trim());

export function toSqlInserts(t: CsvTable, table = 'my_table'): string {
  const ident = (s: string) => '`' + s.replace(/`/g, '``') + '`';
  const val = (s: string) => (s === '' ? 'NULL' : isNumeric(s) && !/^0\d/.test(s.trim()) ? s.trim() : `'${s.replace(/'/g, "''")}'`);
  const cols = t.header.map(ident).join(', ');
  return t.rows.map((r) => `INSERT INTO ${ident(table)} (${cols}) VALUES (${r.map(val).join(', ')});`).join('\n');
}

export function toObjects(t: CsvTable, infer = true): Record<string, unknown>[] {
  const conv = (v: string): unknown => {
    if (!infer) return v;
    if (v === '') return null;
    if (/^(true|false)$/i.test(v)) return v.toLowerCase() === 'true';
    if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(v) && Math.abs(Number(v)) <= Number.MAX_SAFE_INTEGER) return Number(v);
    return v;
  };
  return t.rows.map((r) => Object.fromEntries(t.header.map((h, i) => [h, conv(r[i] ?? '')])));
}

export function sortRows(rows: string[][], col: number, dir: 'asc' | 'desc'): string[][] {
  const numeric = rows.length > 0 && rows.every((r) => (r[col] ?? '') === '' || isNumeric(r[col]!));
  const m = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = a[col] ?? '';
    const y = b[col] ?? '';
    if (numeric) {
      const nx = x === '' ? -Infinity : Number(x);
      const ny = y === '' ? -Infinity : Number(y);
      return nx === ny ? 0 : m * (nx < ny ? -1 : 1);
    }
    return m * x.localeCompare(y, undefined, { numeric: true, sensitivity: 'base' });
  });
}

export function filterRows(rows: string[][], query: string, col: number | null = null): string[][] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => (col === null ? r : [r[col] ?? '']).some((c) => c.toLowerCase().includes(q)));
}

export interface ColumnStats {
  count: number;
  empty: number;
  unique: number;
  numeric: boolean;
  min?: number;
  max?: number;
  sum?: number;
  avg?: number;
  top: [string, number][];
}

export function columnStats(rows: string[][], col: number): ColumnStats {
  const vals = rows.map((r) => r[col] ?? '');
  const nonEmpty = vals.filter((v) => v !== '');
  const freq = new Map<string, number>();
  for (const v of nonEmpty) freq.set(v, (freq.get(v) ?? 0) + 1);
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const numeric = nonEmpty.length > 0 && nonEmpty.every(isNumeric);
  const stats: ColumnStats = { count: vals.length, empty: vals.length - nonEmpty.length, unique: freq.size, numeric, top };
  if (numeric) {
    const nums = nonEmpty.map(Number);
    stats.min = Math.min(...nums);
    stats.max = Math.max(...nums);
    stats.sum = nums.reduce((a, b) => a + b, 0);
    stats.avg = stats.sum / nums.length;
  }
  return stats;
}

// ------------------------------------------------------------------ diff

export interface CsvDiffOptions {
  /** Header name to match rows on; null = pair rows by position. */
  key: string | null;
  trim: boolean;
  ignoreCase: boolean;
}

export type RowDiffType = 'added' | 'removed' | 'changed' | 'same';
export interface CsvRowDiff {
  type: RowDiffType;
  key: string;
  a?: Record<string, string>;
  b?: Record<string, string>;
  changed: string[];
}
export interface CsvDiffResult {
  columns: string[];
  columnsAdded: string[];
  columnsRemoved: string[];
  rows: CsvRowDiff[];
  counts: Record<RowDiffType, number>;
}

export function csvDiff(a: CsvTable, b: CsvTable, o: CsvDiffOptions): CsvDiffResult {
  const norm = (s: string) => {
    let v = o.trim ? s.trim() : s;
    if (o.ignoreCase) v = v.toLowerCase();
    return v;
  };
  const columns = [...a.header, ...b.header.filter((h) => !a.header.includes(h))];
  const common = a.header.filter((h) => b.header.includes(h));
  const toObj = (h: string[], r: string[]) => Object.fromEntries(h.map((c, i) => [c, r[i] ?? '']));
  const aObjs = a.rows.map((r) => toObj(a.header, r));
  const bObjs = b.rows.map((r) => toObj(b.header, r));

  // Build [key, a?, b?] pairs
  const pairs: { key: string; a?: Record<string, string>; b?: Record<string, string> }[] = [];
  if (o.key && common.includes(o.key)) {
    const seen = new Map<string, number>();
    const keyed = (objs: Record<string, string>[]) => {
      const m = new Map<string, Record<string, string>>();
      seen.clear();
      for (const r of objs) {
        const base = norm(r[o.key!]!);
        const n = (seen.get(base) ?? 0) + 1;
        seen.set(base, n);
        m.set(n === 1 ? base : `${base}#${n}`, r);
      }
      return m;
    };
    const am = keyed(aObjs);
    const bm = keyed(bObjs);
    for (const [k, r] of am) pairs.push({ key: k, a: r, b: bm.get(k) });
    for (const [k, r] of bm) if (!am.has(k)) pairs.push({ key: k, b: r });
  } else {
    const n = Math.max(aObjs.length, bObjs.length);
    for (let i = 0; i < n; i++) pairs.push({ key: `row ${i + 1}`, a: aObjs[i], b: bObjs[i] });
  }

  const counts: Record<RowDiffType, number> = { added: 0, removed: 0, changed: 0, same: 0 };
  const rows: CsvRowDiff[] = pairs.map((p) => {
    let type: RowDiffType;
    let changed: string[] = [];
    if (p.a && !p.b) type = 'removed';
    else if (!p.a && p.b) type = 'added';
    else {
      changed = common.filter((c) => norm(p.a![c]!) !== norm(p.b![c]!));
      type = changed.length ? 'changed' : 'same';
    }
    counts[type]++;
    return { type, key: p.key, a: p.a, b: p.b, changed };
  });

  return {
    columns,
    columnsAdded: b.header.filter((h) => !a.header.includes(h)),
    columnsRemoved: a.header.filter((h) => !b.header.includes(h)),
    rows,
    counts,
  };
}
