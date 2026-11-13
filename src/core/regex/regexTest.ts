export interface RegexMatch {
  index: number;
  end: number;
  text: string;
  groups: (string | undefined)[];
  named: Record<string, string | undefined>;
}

export interface RegexResult {
  matches: RegexMatch[];
  error?: string;
  truncated: boolean;
}

const MAX_MATCHES = 2000;

export function runRegex(pattern: string, flags: string, text: string): RegexResult {
  if (!pattern) return { matches: [], truncated: false };
  let re: RegExp;
  try {
    re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
  } catch (e) {
    return { matches: [], error: (e as Error).message, truncated: false };
  }
  const matches: RegexMatch[] = [];
  let truncated = false;
  for (const m of text.matchAll(re)) {
    if (matches.length >= MAX_MATCHES) {
      truncated = true;
      break;
    }
    matches.push({
      index: m.index!,
      end: m.index! + m[0].length,
      text: m[0],
      groups: m.slice(1),
      named: { ...(m.groups ?? {}) },
    });
  }
  return { matches, truncated };
}

export function runReplace(pattern: string, flags: string, text: string, replacement: string): string {
  try {
    return text.replace(new RegExp(pattern, flags), replacement);
  } catch {
    return text;
  }
}
