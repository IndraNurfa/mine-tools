/** Split an identifier or phrase into lowercase words. */
export function splitWords(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^A-Za-z0-9À-￿]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

export type CaseStyle =
  | 'camel'
  | 'pascal'
  | 'snake'
  | 'constant'
  | 'kebab'
  | 'dot'
  | 'title'
  | 'sentence'
  | 'lower'
  | 'upper';

export const CASE_STYLES: { id: CaseStyle; label: string }[] = [
  { id: 'camel', label: 'camelCase' },
  { id: 'pascal', label: 'PascalCase' },
  { id: 'snake', label: 'snake_case' },
  { id: 'constant', label: 'CONSTANT_CASE' },
  { id: 'kebab', label: 'kebab-case' },
  { id: 'dot', label: 'dot.case' },
  { id: 'title', label: 'Title Case' },
  { id: 'sentence', label: 'Sentence case' },
  { id: 'lower', label: 'lower case' },
  { id: 'upper', label: 'UPPER CASE' },
];

export function convertCase(input: string, style: CaseStyle): string {
  const w = splitWords(input);
  switch (style) {
    case 'camel':
      return w.map((x, i) => (i ? cap(x) : x)).join('');
    case 'pascal':
      return w.map(cap).join('');
    case 'snake':
      return w.join('_');
    case 'constant':
      return w.join('_').toUpperCase();
    case 'kebab':
      return w.join('-');
    case 'dot':
      return w.join('.');
    case 'title':
      return w.map(cap).join(' ');
    case 'sentence':
      return cap(w.join(' '));
    case 'lower':
      return w.join(' ');
    case 'upper':
      return w.join(' ').toUpperCase();
  }
}

/** Convert each non-empty line independently, preserving blank lines. */
export function convertCaseLines(text: string, style: CaseStyle): string {
  return text
    .split('\n')
    .map((l) => (l.trim() ? convertCase(l, style) : l))
    .join('\n');
}
