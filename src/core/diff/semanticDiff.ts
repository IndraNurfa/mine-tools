import { ASTNode } from '../parse/types.ts';
import { PathSegment } from '../path/types.ts';

export type DiffChangeType = 'added' | 'removed' | 'changed';

export interface DiffRow {
  path: PathSegment[];
  type: DiffChangeType;
  oldValue?: string;
  newValue?: string;
}

export interface DiffSummary {
  added: number;
  removed: number;
  changed: number;
  total: number;
}

export function areNumbersEqual(n1Str: string, n2Str: string): boolean {
  if (n1Str === n2Str) return true;

  // Try parsing to normalized decimal representation: sign, normalized digits, exponent
  const norm1 = normalizeDecimal(n1Str);
  const norm2 = normalizeDecimal(n2Str);

  if (!norm1 || !norm2) {
    return n1Str === n2Str;
  }

  if (norm1.isZero && norm2.isZero) return true;
  return norm1.sign === norm2.sign && norm1.digits === norm2.digits && norm1.exp === norm2.exp;
}

interface NormalizedDecimal {
  sign: 1 | -1;
  digits: string;
  exp: number;
  isZero: boolean;
}

function normalizeDecimal(str: string): NormalizedDecimal | null {
  let s = str.trim();
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('-.')) s = '-0.' + s.slice(2);
  else if (s.startsWith('.')) s = '0.' + s.slice(1);

  // Hex support
  if (/^[-+]?0[xX][0-9a-fA-F]+$/.test(s)) {
    try {
      const isNeg = s.startsWith('-');
      const hexPart = isNeg ? s.slice(1) : s;
      const big = BigInt(hexPart);
      s = (isNeg ? '-' : '') + big.toString(10);
    } catch {
      return null;
    }
  }

  const match = /^([+-]?)(0|[1-9]\d*|\d*)(\.(\d*))?([eE]([+-]?\d+))?$/.exec(s);
  if (!match) return null;

  const sign: 1 | -1 = match[1] === '-' ? -1 : 1;
  const integerPart = match[2] || '';
  const fractionalPart = match[4] || '';
  const exponentPart = match[6] ? parseInt(match[6], 10) : 0;

  // Combine digits
  let allDigits = integerPart + fractionalPart;
  // Calculate exponent shift based on fractional length
  let exp = exponentPart - fractionalPart.length;

  // Strip leading zeros
  allDigits = allDigits.replace(/^0+/, '');

  if (allDigits.length === 0) {
    return { sign: 1, digits: '0', exp: 0, isZero: true };
  }

  // Strip trailing zeros and adjust exponent
  while (allDigits.endsWith('0')) {
    allDigits = allDigits.slice(0, -1);
    exp += 1;
  }

  return {
    sign,
    digits: allDigits,
    exp,
    isZero: false,
  };
}

export function nodeToDisplayString(node: ASTNode): string {
  switch (node.type) {
    case 'string':
      return JSON.stringify(node.value);
    case 'number':
      return node.raw;
    case 'boolean':
      return node.value ? 'true' : 'false';
    case 'null':
      return 'null';
    case 'object':
      return `{ ... } (${node.children.length} keys)`;
    case 'array':
      return `[ ... ] (${node.children.length} items)`;
  }
}

export function computeSemanticDiff(leftNode: ASTNode, rightNode: ASTNode): DiffRow[] {
  const rows: DiffRow[] = [];

  function diffNodes(left: ASTNode, right: ASTNode, currentPath: PathSegment[]): void {
    if (left.type !== right.type) {
      rows.push({
        path: currentPath,
        type: 'changed',
        oldValue: nodeToDisplayString(left),
        newValue: nodeToDisplayString(right),
      });
      return;
    }

    if (left.type === 'object' && right.type === 'object') {
      const leftMap = new Map<string, ASTNode>();
      for (const p of left.children) {
        leftMap.set(p.key, p.value);
      }
      const rightMap = new Map<string, ASTNode>();
      for (const p of right.children) {
        rightMap.set(p.key, p.value);
      }

      // Check keys in left
      for (const [key, leftVal] of leftMap.entries()) {
        const nextPath = [...currentPath, key];
        if (!rightMap.has(key)) {
          rows.push({
            path: nextPath,
            type: 'removed',
            oldValue: nodeToDisplayString(leftVal),
          });
        } else {
          const rightVal = rightMap.get(key)!;
          diffNodes(leftVal, rightVal, nextPath);
        }
      }

      // Check added keys in right
      for (const [key, rightVal] of rightMap.entries()) {
        if (!leftMap.has(key)) {
          const nextPath = [...currentPath, key];
          rows.push({
            path: nextPath,
            type: 'added',
            newValue: nodeToDisplayString(rightVal),
          });
        }
      }
      return;
    }

    if (left.type === 'array' && right.type === 'array') {
      const maxLen = Math.max(left.children.length, right.children.length);
      for (let i = 0; i < maxLen; i++) {
        const nextPath = [...currentPath, i];
        if (i >= left.children.length) {
          rows.push({
            path: nextPath,
            type: 'added',
            newValue: nodeToDisplayString(right.children[i]),
          });
        } else if (i >= right.children.length) {
          rows.push({
            path: nextPath,
            type: 'removed',
            oldValue: nodeToDisplayString(left.children[i]),
          });
        } else {
          diffNodes(left.children[i], right.children[i], nextPath);
        }
      }
      return;
    }

    // Primitives
    if (left.type === 'number' && right.type === 'number') {
      if (!areNumbersEqual(left.raw, right.raw)) {
        rows.push({
          path: currentPath,
          type: 'changed',
          oldValue: left.raw,
          newValue: right.raw,
        });
      }
      return;
    }

    if (left.type === 'string' && right.type === 'string') {
      if (left.value !== right.value) {
        rows.push({
          path: currentPath,
          type: 'changed',
          oldValue: JSON.stringify(left.value),
          newValue: JSON.stringify(right.value),
        });
      }
      return;
    }

    if (left.type === 'boolean' && right.type === 'boolean') {
      if (left.value !== right.value) {
        rows.push({
          path: currentPath,
          type: 'changed',
          oldValue: left.value ? 'true' : 'false',
          newValue: right.value ? 'true' : 'false',
        });
      }
      return;
    }

    // null vs null has no diff
  }

  diffNodes(leftNode, rightNode, []);
  return rows;
}

export function summarizeDiff(rows: DiffRow[]): DiffSummary {
  let added = 0;
  let removed = 0;
  let changed = 0;

  for (const r of rows) {
    if (r.type === 'added') added++;
    else if (r.type === 'removed') removed++;
    else if (r.type === 'changed') changed++;
  }

  return {
    added,
    removed,
    changed,
    total: rows.length,
  };
}
