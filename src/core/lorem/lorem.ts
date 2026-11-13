const WORDS = (
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ' +
  'enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in ' +
  'reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa ' +
  'qui officia deserunt mollit anim id est laborum curabitur pretium tincidunt lacus nunc porta vestibulum ante primis'
).split(' ');

export type LoremUnit = 'words' | 'sentences' | 'paragraphs';

/** Small seedable PRNG so output can be reproducible (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateLorem(unit: LoremUnit, count: number, startWithLorem = true, seed = Date.now()): string {
  const rand = rng(seed);
  const n = Math.max(1, Math.min(1000, Math.floor(count) || 1));
  const pick = () => WORDS[Math.floor(rand() * WORDS.length)]!;
  const words = (len: number, first: boolean) => {
    const w = Array.from({ length: len }, pick);
    if (first) w.splice(0, Math.min(5, len), ...'lorem ipsum dolor sit amet'.split(' ').slice(0, Math.min(5, len)));
    return w;
  };
  const sentence = (first: boolean) => {
    const len = 6 + Math.floor(rand() * 10);
    const w = words(len, first);
    // occasional comma
    if (len > 9) w[Math.floor(len / 2)] += ',';
    const s = w.join(' ');
    return s[0]!.toUpperCase() + s.slice(1) + '.';
  };
  if (unit === 'words') return words(n, startWithLorem).join(' ');
  if (unit === 'sentences')
    return Array.from({ length: n }, (_, i) => sentence(startWithLorem && i === 0)).join(' ');
  return Array.from({ length: n }, (_, p) =>
    Array.from({ length: 3 + Math.floor(rand() * 4) }, (_, i) => sentence(startWithLorem && p === 0 && i === 0)).join(' '),
  ).join('\n\n');
}
