/**
 * Runs regex jobs in a worker so a catastrophically backtracking pattern can be
 * killed instead of freezing the page.
 */
import type { RegexResult } from './regexTest.ts';

export interface RegexJob {
  pattern: string;
  flags: string;
  text: string;
  replacement: string;
}

export interface RegexOutput extends RegexResult {
  replaced: string;
}

/** The slice of `Worker` the runner needs. */
export interface RegexWorker {
  onmessage: ((e: MessageEvent<RegexOutput>) => void) | null;
  onerror: ((e: unknown) => void) | null;
  postMessage(job: RegexJob): void;
  terminate(): void;
}

export const REGEX_TIMEOUT_MS = 2000;

const failure = (error: string): RegexOutput => ({ matches: [], truncated: false, replaced: '', error });

/** Only the latest job matters: starting one abandons whatever is still running. */
export function createRegexRunner(spawn: () => RegexWorker, timeoutMs = REGEX_TIMEOUT_MS) {
  let worker: RegexWorker | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let busy = false;

  const dispose = () => {
    clearTimeout(timer);
    worker?.terminate();
    worker = null;
    busy = false;
  };

  const run = (job: RegexJob, done: (out: RegexOutput) => void) => {
    // A busy worker can't be interrupted, only replaced.
    if (busy) dispose();
    const fail = (message: string) => {
      dispose();
      done(failure(message));
    };
    try {
      worker ??= spawn();
      busy = true;
      worker.onmessage = (e) => {
        clearTimeout(timer);
        busy = false;
        done(e.data);
      };
      worker.onerror = () => fail('The regex worker failed to run.');
      timer = setTimeout(
        () => fail(`Stopped after ${timeoutMs / 1000} s. The pattern may backtrack heavily, for example (a+)+.`),
        timeoutMs,
      );
      worker.postMessage(job);
    } catch {
      fail('The regex worker failed to start.');
    }
  };

  return { run, dispose };
}
