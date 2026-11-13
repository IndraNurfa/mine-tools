/** Cryptographically secure random helpers (no modulo bias). */

export function randomInt(min: number, max: number): number {
  if (max < min) [min, max] = [max, min];
  const range = max - min + 1;
  if (range > 2 ** 32) throw new Error('Range too large');
  const limit = Math.floor(2 ** 32 / range) * range;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf);
  while (buf[0]! >= limit);
  return min + (buf[0]! % range);
}

export interface PasswordOptions {
  length: number;
  lower: boolean;
  upper: boolean;
  digits: boolean;
  symbols: boolean;
  noAmbiguous: boolean;
  custom?: string;
}

const SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?/~',
};
const AMBIGUOUS = /[O0oIl1|`'"]/g;

export function passwordCharset(o: PasswordOptions): string[] {
  const sets: string[] = [];
  for (const k of ['lower', 'upper', 'digits', 'symbols'] as const) if (o[k]) sets.push(SETS[k]);
  if (o.custom) sets.push(o.custom);
  return sets.map((s) => (o.noAmbiguous ? s.replace(AMBIGUOUS, '') : s)).filter(Boolean);
}

/** Guarantees at least one char from every enabled set when length allows. */
export function generatePassword(o: PasswordOptions): string {
  const sets = passwordCharset(o);
  if (!sets.length) return '';
  const length = Math.max(1, Math.min(512, Math.floor(o.length) || 1));
  const all = [...new Set(sets.join(''))];
  const chars: string[] = [];
  if (length >= sets.length) for (const s of sets) chars.push(s[randomInt(0, s.length - 1)]!);
  while (chars.length < length) chars.push(all[randomInt(0, all.length - 1)]!);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join('');
}

export function entropyBits(o: PasswordOptions): number {
  const size = new Set(passwordCharset(o).join('')).size;
  return size > 1 ? Math.round(Math.max(1, o.length) * Math.log2(size)) : 0;
}

export function randomBytesHex(n: number): string {
  const b = new Uint8Array(Math.max(1, Math.min(1024, n)));
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export function randomBytesBase64Url(n: number): string {
  const b = new Uint8Array(Math.max(1, Math.min(1024, n)));
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
