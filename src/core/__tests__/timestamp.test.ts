import { describe, it, expect } from 'vitest';
import { parseTimestamp, relativeTime, formatTimestamp } from '../time/timestamp.ts';

describe('timestamp', () => {
  it('detects seconds vs millis', () => {
    expect(parseTimestamp('1700000000')!.toISOString()).toBe('2023-11-14T22:13:20.000Z');
    expect(parseTimestamp('1700000000000')!.toISOString()).toBe('2023-11-14T22:13:20.000Z');
    expect(parseTimestamp('1700000000000000')!.toISOString()).toBe('2023-11-14T22:13:20.000Z');
  });
  it('parses ISO strings and rejects junk', () => {
    expect(parseTimestamp('2023-11-14T22:13:20Z')!.getTime()).toBe(1700000000000);
    expect(parseTimestamp('not a date')).toBeNull();
    expect(parseTimestamp('  ')).toBeNull();
  });
  it('relative time', () => {
    const now = 1_000_000_000_000;
    expect(relativeTime(new Date(now - 3 * 3600_000), now)).toBe('3 hours ago');
    expect(relativeTime(new Date(now + 60_000), now)).toBe('in 1 minute');
    expect(relativeTime(new Date(now), now)).toBe('just now');
  });
  it('formats', () => {
    const f = formatTimestamp(new Date(1700000000000), 1700000000000);
    expect(f.unixSeconds).toBe('1700000000');
    expect(f.iso).toBe('2023-11-14T22:13:20.000Z');
  });
});
