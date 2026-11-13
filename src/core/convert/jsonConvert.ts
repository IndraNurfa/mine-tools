import type { ASTNode } from '../parse/types.ts';

/** Keeps the exact source text of numbers that JS Number can't hold losslessly. */
export class RawNumber {
  constructor(public raw: string) {}
}
export type Value = null | boolean | string | number | RawNumber | Value[] | { [k: string]: Value };

export function astToValue(node: ASTNode): Value {
  switch (node.type) {
    case 'object': {
      const o: { [k: string]: Value } = {};
      for (const p of node.children) o[p.key] = astToValue(p.value);
      return o;
    }
    case 'array':
      return node.children.map(astToValue);
    case 'string':
      return node.value;
    case 'number': {
      const n = Number(node.normalized);
      return Number.isFinite(n) && String(n) === node.normalized ? n : new RawNumber(node.normalized);
    }
    case 'boolean':
      return (node as { value: boolean }).value;
    case 'null':
      return null;
  }
}

const isObj = (v: Value): v is { [k: string]: Value } =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof RawNumber);

// ---------------------------------------------------------------- YAML

function yamlScalar(v: Value): string {
  if (v === null) return 'null';
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  if (v instanceof RawNumber) return v.raw;
  if (typeof v === 'string') {
    const plain =
      /^[A-Za-z_][\w./-]*( [\w./-]+)*$/.test(v) &&
      !/^(true|false|null|yes|no|on|off|y|n|~)$/i.test(v);
    return plain ? v : JSON.stringify(v);
  }
  return '';
}

export function toYaml(value: Value, indent = 0): string {
  const pad = '  '.repeat(indent);
  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    return value
      .map((item) => {
        if (Array.isArray(item) ? item.length : isObj(item) && Object.keys(item).length) {
          const inner = toYaml(item, indent + 1).split('\n');
          return `${pad}- ${inner[0]!.trimStart()}` + (inner.length > 1 ? '\n' + inner.slice(1).join('\n') : '');
        }
        return `${pad}- ${Array.isArray(item) ? '[]' : isObj(item) ? '{}' : yamlScalar(item)}`;
      })
      .join('\n');
  }
  if (isObj(value)) {
    const keys = Object.keys(value);
    if (!keys.length) return '{}';
    return keys
      .map((k) => {
        const key = /^[A-Za-z_][\w-]*$/.test(k) ? k : JSON.stringify(k);
        const v = value[k]!;
        if (Array.isArray(v) ? v.length : isObj(v) && Object.keys(v).length) {
          return `${pad}${key}:\n${toYaml(v, indent + 1)}`;
        }
        return `${pad}${key}: ${Array.isArray(v) ? '[]' : isObj(v) ? '{}' : yamlScalar(v)}`;
      })
      .join('\n');
  }
  return yamlScalar(value);
}

// ----------------------------------------------------------------- CSV

function flatten(v: Value, prefix: string, out: Record<string, Value>) {
  if (isObj(v)) {
    const keys = Object.keys(v);
    if (!keys.length && prefix) out[prefix] = '{}';
    for (const k of keys) flatten(v[k]!, prefix ? `${prefix}.${k}` : k, out);
  } else if (Array.isArray(v)) {
    out[prefix || 'value'] = JSON.stringify(v, (_, x) => (x instanceof RawNumber ? Number(x.raw) : x));
  } else {
    out[prefix || 'value'] = v;
  }
}

function csvCell(v: Value | undefined): string {
  if (v === undefined || v === null) return '';
  const s = v instanceof RawNumber ? v.raw : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(value: Value): string {
  const rows = Array.isArray(value) ? value : [value];
  const flat = rows.map((r) => {
    const o: Record<string, Value> = {};
    flatten(r, '', o);
    return o;
  });
  const cols: string[] = [];
  for (const r of flat) for (const k of Object.keys(r)) if (!cols.includes(k)) cols.push(k);
  return [cols.map((c) => csvCell(c)).join(','), ...flat.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n');
}

// ----------------------------------------------------------- TypeScript

type Shape =
  | { kind: 'prim'; name: string }
  | { kind: 'obj'; props: Map<string, { shape: Shape; optional: boolean }> }
  | { kind: 'arr'; el: Shape | null }
  | { kind: 'union'; members: Shape[] };

function infer(v: Value): Shape {
  if (v === null) return { kind: 'prim', name: 'null' };
  if (Array.isArray(v)) return { kind: 'arr', el: v.map(infer).reduce<Shape | null>((a, s) => (a ? merge(a, s) : s), null) };
  if (isObj(v)) {
    const props = new Map<string, { shape: Shape; optional: boolean }>();
    for (const k of Object.keys(v)) props.set(k, { shape: infer(v[k]!), optional: false });
    return { kind: 'obj', props };
  }
  if (v instanceof RawNumber) return { kind: 'prim', name: 'number' };
  return { kind: 'prim', name: typeof v };
}

function merge(a: Shape, b: Shape): Shape {
  if (a.kind === 'obj' && b.kind === 'obj') {
    const props = new Map<string, { shape: Shape; optional: boolean }>();
    for (const [k, p] of a.props) {
      const q = b.props.get(k);
      props.set(k, q ? { shape: merge(p.shape, q.shape), optional: p.optional || q.optional } : { ...p, optional: true });
    }
    for (const [k, q] of b.props) if (!a.props.has(k)) props.set(k, { ...q, optional: true });
    return { kind: 'obj', props };
  }
  if (a.kind === 'arr' && b.kind === 'arr') {
    return { kind: 'arr', el: a.el && b.el ? merge(a.el, b.el) : a.el ?? b.el };
  }
  if (a.kind === 'prim' && b.kind === 'prim' && a.name === b.name) return a;
  const members: Shape[] = [];
  for (const s of [...(a.kind === 'union' ? a.members : [a]), ...(b.kind === 'union' ? b.members : [b])]) {
    const i = members.findIndex((m) => m.kind === s.kind && (s.kind !== 'prim' || (m as typeof s).name === s.name));
    if (i >= 0) members[i] = merge(members[i]!, s);
    else members.push(s);
  }
  return members.length === 1 ? members[0]! : { kind: 'union', members };
}

const pascal = (s: string) =>
  s.replace(/(^|[^A-Za-z0-9]+)([A-Za-z0-9])/g, (_, __, c: string) => c.toUpperCase()).replace(/^[0-9]/, '_$&') || 'Item';

export function toTypeScript(value: Value, rootName = 'Root'): string {
  const decls: string[] = [];
  const used = new Set<string>();
  const uniqueName = (base: string) => {
    let n = base,
      i = 2;
    while (used.has(n)) n = base + i++;
    used.add(n);
    return n;
  };

  const render = (s: Shape, hint: string): string => {
    switch (s.kind) {
      case 'prim':
        return s.name;
      case 'arr': {
        if (!s.el) return 'unknown[]';
        const t = render(s.el, hint);
        return s.el.kind === 'union' ? `(${t})[]` : `${t}[]`;
      }
      case 'union':
        return s.members.map((m) => render(m, hint)).join(' | ');
      case 'obj': {
        if (!s.props.size) return 'Record<string, unknown>';
        const name = uniqueName(pascal(hint));
        const idx = decls.length;
        decls.push('');
        const lines = [...s.props].map(([k, p]) => {
          const key = /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
          return `  ${key}${p.optional ? '?' : ''}: ${render(p.shape, k)};`;
        });
        decls[idx] = `export interface ${name} {\n${lines.join('\n')}\n}`;
        return name;
      }
    }
  };

  const shape = infer(value);
  const top = render(shape, rootName);
  if (shape.kind !== 'obj' || !decls.length) decls.push(`export type ${pascal(rootName)} = ${top};`);
  return decls.join('\n\n');
}

// ----------------------------------------------------------- CSV → JSON

export function parseCsv(text: string, delimiter = ','): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === delimiter) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

/** CSV with a header row → array of objects; numbers/booleans/empty→null are inferred when `infer`. */
export function csvToJson(text: string, opts: { delimiter?: string; infer?: boolean } = {}): string {
  const rows = parseCsv(text, opts.delimiter ?? ',');
  if (!rows.length) return '[]';
  const [head, ...body] = rows as [string[], ...string[][]];
  const conv = (v: string): unknown => {
    if (!opts.infer) return v;
    if (v === '') return null;
    if (/^(true|false)$/i.test(v)) return v.toLowerCase() === 'true';
    if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(v) && Math.abs(Number(v)) <= Number.MAX_SAFE_INTEGER) return Number(v);
    return v;
  };
  const objs = body.map((r) => Object.fromEntries(head.map((h, i) => [h, conv(r[i] ?? '')])));
  return JSON.stringify(objs, null, 2);
}
