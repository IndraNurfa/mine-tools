import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRegexRunner, type RegexOutput, type RegexWorker } from '../regex/runner.ts';

const job = { pattern: 'a', flags: 'g', text: 'a', replacement: '' };
const output: RegexOutput = { matches: [], truncated: false, replaced: '' };

function setup() {
  const workers: (RegexWorker & { terminated: boolean })[] = [];
  const runner = createRegexRunner(() => {
    const w = {
      onmessage: null,
      onerror: null,
      terminated: false,
      postMessage() {},
      terminate() {
        this.terminated = true;
      },
    } as RegexWorker & { terminated: boolean };
    workers.push(w);
    return w;
  }, 1000);
  const reply = (i: number) => workers[i]!.onmessage?.({ data: output } as MessageEvent<RegexOutput>);
  return { runner, workers, reply };
}

describe('regex runner', () => {
  afterEach(() => vi.useRealTimers());

  it('delivers a result and reuses the idle worker', () => {
    vi.useFakeTimers();
    const { runner, workers, reply } = setup();
    const done = vi.fn();
    runner.run(job, done);
    reply(0);
    runner.run(job, done);
    reply(0);
    vi.advanceTimersByTime(5000);
    expect(done.mock.calls).toEqual([[output], [output]]);
    expect(workers).toHaveLength(1);
  });

  it('kills a job that runs too long, then recovers', () => {
    vi.useFakeTimers();
    const { runner, workers, reply } = setup();
    const done = vi.fn();
    runner.run(job, done);
    vi.advanceTimersByTime(1000);
    expect(workers[0]!.terminated).toBe(true);
    expect(done.mock.calls[0]![0].error).toContain('Stopped after 1 s');
    runner.run(job, done);
    reply(1);
    expect(done).toHaveBeenLastCalledWith(output);
  });

  it('replaces a busy worker when a newer job arrives', () => {
    vi.useFakeTimers();
    const { runner, workers, reply } = setup();
    const first = vi.fn();
    const second = vi.fn();
    runner.run(job, first);
    runner.run(job, second);
    expect(workers[0]!.terminated).toBe(true);
    reply(1);
    vi.advanceTimersByTime(5000);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });

  it('reports a worker that cannot start', () => {
    const done = vi.fn();
    createRegexRunner(() => {
      throw new Error('blocked');
    }).run(job, done);
    expect(done.mock.calls[0]![0].error).toContain('failed to start');
  });
});
