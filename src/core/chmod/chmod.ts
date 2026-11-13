export interface Perm {
  r: boolean;
  w: boolean;
  x: boolean;
}
export interface Perms {
  owner: Perm;
  group: Perm;
  other: Perm;
}
const WHO = ['owner', 'group', 'other'] as const;

export function permsToOctal(p: Perms): string {
  return WHO.map((w) => (p[w].r ? 4 : 0) + (p[w].w ? 2 : 0) + (p[w].x ? 1 : 0)).join('');
}

export function permsToSymbolic(p: Perms): string {
  return WHO.map((w) => (p[w].r ? 'r' : '-') + (p[w].w ? 'w' : '-') + (p[w].x ? 'x' : '-')).join('');
}

export function octalToPerms(octal: string): Perms | null {
  const m = /^[0-7]?([0-7]{3})$/.exec(octal.trim());
  if (!m) return null;
  const [o, g, t] = [...m[1]!].map(Number) as [number, number, number];
  const f = (n: number): Perm => ({ r: !!(n & 4), w: !!(n & 2), x: !!(n & 1) });
  return { owner: f(o), group: f(g), other: f(t) };
}

export function symbolicToPerms(sym: string): Perms | null {
  const m = /^[-dl]?([r-][w-][x-])([r-][w-][x-])([r-][w-][x-])$/.exec(sym.trim());
  if (!m) return null;
  const f = (s: string): Perm => ({ r: s[0] === 'r', w: s[1] === 'w', x: s[2] === 'x' });
  return { owner: f(m[1]!), group: f(m[2]!), other: f(m[3]!) };
}

export const COMMON_MODES: { mode: string; note: string }[] = [
  { mode: '644', note: 'files: owner rw, others read' },
  { mode: '755', note: 'executables / dirs: owner rwx, others rx' },
  { mode: '600', note: 'private files (ssh keys)' },
  { mode: '700', note: 'private dirs / scripts' },
  { mode: '664', note: 'group-writable files' },
  { mode: '775', note: 'group-writable dirs' },
  { mode: '777', note: 'everyone everything (avoid)' },
  { mode: '400', note: 'read-only for owner' },
];
