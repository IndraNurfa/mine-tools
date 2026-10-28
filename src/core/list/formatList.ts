export type QuoteStyle = 'none' | 'single' | 'double' | 'backtick';
export type WrapperStyle = 'none' | 'parens' | 'brackets' | 'braces';

export interface ListFormatOptions {
  separator: string;
  quote: QuoteStyle;
  wrapper: WrapperStyle;
  trim: boolean;
  skipEmpty: boolean;
  dedupe: boolean;
}

const QUOTE_CHAR: Record<Exclude<QuoteStyle, 'none'>, string> = {
  single: "'",
  double: '"',
  backtick: '`',
};

const WRAPPERS: Record<Exclude<WrapperStyle, 'none'>, [string, string]> = {
  parens: ['(', ')'],
  brackets: ['[', ']'],
  braces: ['{', '}'],
};

/** Split paste from a sheet column or any multi-line blob into items. */
export function splitLines(
  input: string,
  opts: Pick<ListFormatOptions, 'trim' | 'skipEmpty' | 'dedupe'>,
): string[] {
  let items = input.split(/\r\n|\n|\r/);
  if (opts.trim) items = items.map((s) => s.trim());
  if (opts.skipEmpty) items = items.filter((s) => s.length > 0);
  if (opts.dedupe) {
    const seen = new Set<string>();
    items = items.filter((s) => {
      if (seen.has(s)) return false;
      seen.add(s);
      return true;
    });
  }
  return items;
}

function applyQuote(item: string, quote: QuoteStyle): string {
  if (quote === 'none') return item;
  const q = QUOTE_CHAR[quote];
  // Escape the quote char inside the value by doubling (SQL-ish) for single/double;
  // for backtick escape with backslash to stay readable in JS contexts.
  if (quote === 'backtick') {
    return q + item.replace(/\\/g, '\\\\').replace(/`/g, '\\`') + q;
  }
  return q + item.split(q).join(q + q) + q;
}

export function formatList(items: string[], opts: ListFormatOptions): string {
  const joined = items.map((i) => applyQuote(i, opts.quote)).join(opts.separator);
  if (opts.wrapper === 'none') return joined;
  const [open, close] = WRAPPERS[opts.wrapper];
  return open + joined + close;
}

export function formatPlainAndQuoted(
  input: string,
  base: Omit<ListFormatOptions, 'quote'> & { quote: QuoteStyle },
): { items: string[]; plain: string; quoted: string } {
  const items = splitLines(input, base);
  const plain = formatList(items, { ...base, quote: 'none' });
  // If user already chose a quote style, use it for "quoted"; otherwise default to single.
  const quotedStyle: QuoteStyle = base.quote === 'none' ? 'single' : base.quote;
  const quoted = formatList(items, { ...base, quote: quotedStyle });
  return { items, plain, quoted };
}
