import { describe, it, expect } from 'vitest';
import { parseCron, nextRuns, describeCron } from '../cron/cron.ts';

describe('cron', () => {
  it('parses fields, steps, names and sunday=7', () => {
    const s = parseCron('*/15 9-17 * JAN,mar mon-fri');
    expect([...s.minute.values]).toEqual([0, 15, 30, 45]);
    expect(s.hour.values.size).toBe(9);
    expect([...s.month.values]).toEqual([1, 3]);
    expect([...s.dow.values]).toEqual([1, 2, 3, 4, 5]);
    expect(parseCron('0 0 * * 7').dow.values.has(0)).toBe(true);
  });
  it('aliases and errors', () => {
    expect(parseCron('@daily').hour.values.has(0)).toBe(true);
    expect(() => parseCron('* * * *')).toThrow();
    expect(() => parseCron('60 * * * *')).toThrow();
    expect(() => parseCron('*/0 * * * *')).toThrow();
  });
  it('computes next runs (UTC)', () => {
    const from = new Date('2024-01-31T10:00:00Z');
    const runs = nextRuns(parseCron('30 9 * * *'), from, 3, true).map((d) => d.toISOString());
    expect(runs).toEqual(['2024-02-01T09:30:00.000Z', '2024-02-02T09:30:00.000Z', '2024-02-03T09:30:00.000Z']);
  });
  it('dom OR dow when both restricted', () => {
    const from = new Date('2024-01-01T00:00:00Z'); // Monday
    const runs = nextRuns(parseCron('0 0 15 * 5'), from, 3, true).map((d) => d.toISOString().slice(0, 10));
    expect(runs).toEqual(['2024-01-05', '2024-01-12', '2024-01-15']);
  });
  it('handles Feb 29', () => {
    const runs = nextRuns(parseCron('0 0 29 2 *'), new Date('2024-03-01T00:00:00Z'), 1, true);
    expect(runs[0]!.toISOString().slice(0, 10)).toBe('2028-02-29');
  });
  it('describes', () => {
    expect(describeCron(parseCron('* * * * *'))).toBe('Every minute');
    expect(describeCron(parseCron('*/5 * * * *'))).toBe('Every 5 minutes');
    expect(describeCron(parseCron('30 9 * * 1-5'))).toBe('At 09:30, on Monday through Friday');
    expect(describeCron(parseCron('0 0 1 jan *'))).toBe('At 00:00, on day 1st of the month, in January');
  });
});
