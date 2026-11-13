export type SortMode = 'none' | 'asc' | 'desc' | 'natural' | 'length' | 'reverse';

export interface LineOptions {
  sort: SortMode;
  dedupe: boolean;
  trim: boolean;
  removeEmpty: boolean;
  caseInsensitive: boolean;
}

export function processLines(text: string, o: LineOptions): string[] {
  let lines = text.split(/\r?\n/);
  if (o.trim) lines = lines.map((l) => l.trim());
  if (o.removeEmpty) lines = lines.filter((l) => l.trim() !== '');
  if (o.dedupe) {
    const seen = new Set<string>();
    lines = lines.filter((l) => {
      const k = o.caseInsensitive ? l.toLowerCase() : l;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  const key = (l: string) => (o.caseInsensitive ? l.toLowerCase() : l);
  switch (o.sort) {
    case 'asc':
      lines.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
      break;
    case 'desc':
      lines.sort((a, b) => (key(a) < key(b) ? 1 : key(a) > key(b) ? -1 : 0));
      break;
    case 'natural':
      lines.sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: o.caseInsensitive ? 'base' : 'variant' }),
      );
      break;
    case 'length':
      lines.sort((a, b) => a.length - b.length);
      break;
    case 'reverse':
      lines.reverse();
      break;
  }
  return lines;
}
