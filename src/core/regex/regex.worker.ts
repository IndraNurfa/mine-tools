import { runRegex, runReplace } from './regexTest.ts';
import type { RegexJob, RegexOutput } from './runner.ts';

self.onmessage = (e: MessageEvent<RegexJob>) => {
  const { pattern, flags, text, replacement } = e.data;
  const result = runRegex(pattern, flags, text);
  const out: RegexOutput = {
    ...result,
    replaced: replacement && !result.error ? runReplace(pattern, flags, text, replacement) : '',
  };
  self.postMessage(out);
};
