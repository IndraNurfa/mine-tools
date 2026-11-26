import { useEffect, useState } from 'react';
import {
  createRegexRunner, type RegexJob, type RegexOutput, type RegexWorker,
} from '../../core/regex/runner.ts';

const spawn = () =>
  new Worker(new URL('../../core/regex/regex.worker.ts', import.meta.url), {
    type: 'module',
  }) as unknown as RegexWorker;

const EMPTY: RegexOutput = { matches: [], truncated: false, replaced: '' };

/**
 * Latest regex result, the text it was computed from (so highlights never apply
 * old offsets to new text), and whether a newer job is still running.
 */
export function useRegex({ pattern, flags, text, replacement }: RegexJob) {
  const [runner] = useState(() => createRegexRunner(spawn));
  const [done, setDone] = useState<{ job: RegexJob; out: RegexOutput } | null>(null);

  useEffect(() => runner.dispose, [runner]);

  useEffect(() => {
    const job = { pattern, flags, text, replacement };
    runner.run(job, (out) => setDone({ job, out }));
  }, [runner, pattern, flags, text, replacement]);

  const pending =
    !done ||
    done.job.pattern !== pattern ||
    done.job.flags !== flags ||
    done.job.text !== text ||
    done.job.replacement !== replacement;

  return { result: done?.out ?? EMPTY, resultText: done?.job.text ?? '', pending };
}
