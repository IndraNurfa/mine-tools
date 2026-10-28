import React, { useMemo, useState } from 'react';
import { useToast } from '../../components/Toast.tsx';
import {
  ListFormatOptions,
  QuoteStyle,
  WrapperStyle,
  formatList,
  splitLines,
} from '../../core/list/formatList.ts';
import { Copy, ClipboardPaste, Trash2, List } from 'lucide-react';

const SAMPLE = `apple
banana
cherry
date
elderberry`;

const SEPARATORS: { id: string; label: string; value: string }[] = [
  { id: 'comma-space', label: ', ', value: ', ' },
  { id: 'comma', label: ',', value: ',' },
  { id: 'space', label: 'space', value: ' ' },
  { id: 'pipe', label: ' | ', value: ' | ' },
  { id: 'semicolon', label: '; ', value: '; ' },
  { id: 'newline', label: '\\n', value: '\n' },
];

const QUOTES: { id: QuoteStyle; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'single', label: "''" },
  { id: 'double', label: '""' },
  { id: 'backtick', label: '``' },
];

const WRAPPERS: { id: WrapperStyle; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'parens', label: '(…)' },
  { id: 'brackets', label: '[…]' },
  { id: 'braces', label: '{…}' },
];

export const ListFormatterTool: React.FC = () => {
  const { showToast } = useToast();
  const [input, setInput] = useState(SAMPLE);
  const [separatorId, setSeparatorId] = useState('comma-space');
  const [customSep, setCustomSep] = useState('');
  const [useCustomSep, setUseCustomSep] = useState(false);
  const [quote, setQuote] = useState<QuoteStyle>('single');
  const [wrapper, setWrapper] = useState<WrapperStyle>('none');
  const [trim, setTrim] = useState(true);
  const [skipEmpty, setSkipEmpty] = useState(true);
  const [dedupe, setDedupe] = useState(false);

  const separator = useCustomSep
    ? customSep
    : (SEPARATORS.find((s) => s.id === separatorId)?.value ?? ', ');

  const opts: ListFormatOptions = useMemo(
    () => ({ separator, quote, wrapper, trim, skipEmpty, dedupe }),
    [separator, quote, wrapper, trim, skipEmpty, dedupe],
  );

  const items = useMemo(() => splitLines(input, opts), [input, opts]);
  const plain = useMemo(() => formatList(items, { ...opts, quote: 'none' }), [items, opts]);
  const quoted = useMemo(() => formatList(items, opts), [items, opts]);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied`);
    } catch {
      showToast('Clipboard access denied', { type: 'error' });
    }
  };

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text);
      showToast('Pasted from clipboard');
    } catch {
      showToast('Clipboard access denied', { type: 'error' });
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0 bg-canvas">
      {/* Options bar */}
      <div className="shrink-0 border-b border-hairline px-4 py-3 space-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-mute uppercase tracking-wider text-[10px] font-semibold">
              Separator
            </span>
            <select
              value={useCustomSep ? '__custom' : separatorId}
              onChange={(e) => {
                if (e.target.value === '__custom') {
                  setUseCustomSep(true);
                } else {
                  setUseCustomSep(false);
                  setSeparatorId(e.target.value);
                }
              }}
              className="bg-canvas-soft border border-hairline rounded-sm px-2 py-1 text-ink text-xs focus:outline-none focus:border-primary"
            >
              {SEPARATORS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
              <option value="__custom">Custom…</option>
            </select>
            {useCustomSep && (
              <input
                type="text"
                value={customSep}
                onChange={(e) => setCustomSep(e.target.value)}
                placeholder="e.g. · "
                className="w-24 bg-canvas-soft border border-hairline rounded-sm px-2 py-1 text-ink text-xs focus:outline-none focus:border-primary font-mono"
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-mute uppercase tracking-wider text-[10px] font-semibold">
              Quote
            </span>
            <div className="flex rounded-sm border border-hairline overflow-hidden">
              {QUOTES.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setQuote(q.id)}
                  className={`px-2.5 py-1 font-mono transition-colors ${
                    quote === q.id
                      ? 'bg-primary/15 text-primary'
                      : 'bg-canvas-soft text-mute hover:text-ink'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-mute uppercase tracking-wider text-[10px] font-semibold">
              Wrapper
            </span>
            <div className="flex rounded-sm border border-hairline overflow-hidden">
              {WRAPPERS.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setWrapper(w.id)}
                  className={`px-2.5 py-1 font-mono transition-colors ${
                    wrapper === w.id
                      ? 'bg-primary/15 text-primary'
                      : 'bg-canvas-soft text-mute hover:text-ink'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-body hover:text-ink">
            <input
              type="checkbox"
              checked={trim}
              onChange={(e) => setTrim(e.target.checked)}
              className="accent-primary"
            />
            Trim
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-body hover:text-ink">
            <input
              type="checkbox"
              checked={skipEmpty}
              onChange={(e) => setSkipEmpty(e.target.checked)}
              className="accent-primary"
            />
            Skip empties
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-body hover:text-ink">
            <input
              type="checkbox"
              checked={dedupe}
              onChange={(e) => setDedupe(e.target.checked)}
              className="accent-primary"
            />
            Dedupe
          </label>
          <span className="ml-auto font-mono text-mute">
            <span className="text-primary font-semibold">{items.length}</span> item
            {items.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Panes */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3">
        {/* Input */}
        <div className="flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r border-hairline">
          <div className="h-10 px-3 flex items-center justify-between border-b border-hairline shrink-0">
            <span className="text-[10px] font-semibold uppercase tracking-[2px] text-mute flex items-center gap-1.5">
              <List className="w-3 h-3" />
              Lines in
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={paste}
                className="p-1.5 rounded-sm text-mute hover:text-ink hover:bg-canvas-soft transition-colors"
                title="Paste"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setInput('')}
                className="p-1.5 rounded-sm text-mute hover:text-ink hover:bg-canvas-soft transition-colors"
                title="Clear"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste a column from a sheet, or one item per line…"
            spellCheck={false}
            className="flex-1 min-h-[160px] w-full resize-none bg-canvas text-ink text-sm font-mono p-3 focus:outline-none placeholder-mute"
          />
        </div>

        {/* Plain join */}
        <OutputPane
          title="Plain join"
          subtitle="no quotes"
          value={plain}
          onCopy={() => copy(plain, 'Plain join')}
        />

        {/* Quoted join */}
        <OutputPane
          title="Quoted join"
          subtitle={quote === 'none' ? 'quote = none' : `quote = ${quote}`}
          value={quoted}
          onCopy={() => copy(quoted, 'Quoted join')}
        />
      </div>
    </div>
  );
};

function OutputPane({
  title,
  subtitle,
  value,
  onCopy,
}: {
  title: string;
  subtitle: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <div className="flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r border-hairline last:border-r-0">
      <div className="h-10 px-3 flex items-center justify-between border-b border-hairline shrink-0">
        <div className="min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-[2px] text-mute">
            {title}
          </span>
          <span className="text-[10px] text-mute ml-2 font-mono">{subtitle}</span>
        </div>
        <button
          type="button"
          onClick={onCopy}
          disabled={!value}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs text-mute hover:text-ink hover:bg-canvas-soft border border-transparent hover:border-hairline transition-colors disabled:opacity-40"
        >
          <Copy className="w-3.5 h-3.5" />
          Copy
        </button>
      </div>
      <pre className="flex-1 min-h-[120px] overflow-auto p-3 text-sm font-mono text-ink whitespace-pre-wrap break-all">
        {value || <span className="text-mute">—</span>}
      </pre>
    </div>
  );
}
