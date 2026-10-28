import { describe, it, expect } from 'vitest';
import { computeCharStats } from '../text/charStats.ts';

describe('computeCharStats', () => {
  it('counts empty as zeros', () => {
    expect(computeCharStats('')).toEqual({
      characters: 0,
      charactersNoSpaces: 0,
      words: 0,
      lines: 0,
      utf8Bytes: 0,
    });
  });

  it('counts words, lines, and unicode', () => {
    const s = 'hi 世界\nthere';
    const stats = computeCharStats(s);
    expect(stats.words).toBe(3);
    expect(stats.lines).toBe(2);
    expect(stats.characters).toBe([...s].length);
    expect(stats.utf8Bytes).toBe(new TextEncoder().encode(s).length);
    expect(stats.charactersNoSpaces).toBe([...s.replace(/\s/g, '')].length);
  });
});
