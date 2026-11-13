/** Arbitrary-size base conversion using BigInt (bases 2–36). */
export function convertBase(input: string, from: number, to: number): string {
  let s = input.trim().toLowerCase().replace(/[_\s]/g, '');
  if (!s) return '';
  let neg = false;
  if (s.startsWith('-')) {
    neg = true;
    s = s.slice(1);
  }
  const prefix = { 16: '0x', 2: '0b', 8: '0o' }[from as 16 | 2 | 8];
  if (prefix && s.startsWith(prefix)) s = s.slice(2);
  const digits = '0123456789abcdefghijklmnopqrstuvwxyz';
  let n = 0n;
  const B = BigInt(from);
  for (const ch of s) {
    const d = digits.indexOf(ch);
    if (d < 0 || d >= from) throw new Error(`"${ch}" is not a valid base-${from} digit`);
    n = n * B + BigInt(d);
  }
  return (neg && n !== 0n ? '-' : '') + n.toString(to);
}

export const BYTE_UNITS_SI = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
export const BYTE_UNITS_IEC = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];

export function toBytes(value: number, unit: string): number {
  const si = BYTE_UNITS_SI.indexOf(unit);
  if (si >= 0) return value * 1000 ** si;
  const iec = BYTE_UNITS_IEC.indexOf(unit);
  if (iec >= 0) return value * 1024 ** iec;
  throw new Error(`Unknown unit ${unit}`);
}

export function fromBytes(bytes: number, unit: string): number {
  return bytes / toBytes(1, unit);
}

/** Trim float noise: 3 significant decimals max, no trailing zeros. */
export function prettyNumber(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n !== 0 && Math.abs(n) < 0.001) return n.toExponential(3);
  return String(Number(n.toFixed(3)));
}
