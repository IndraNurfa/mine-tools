import React, { useMemo, useState } from 'react';
import { useToast } from '../../components/Toast.tsx';
import { computeCharStats } from '../../core/text/charStats.ts';
import { ClipboardPaste, Trash2, Type } from 'lucide-react';

const SAMPLE = `The quick brown fox jumps over the lazy dog.
Pack my box with five dozen liquor jugs.`;

export const CharCountTool: React.FC = () => {
  const { showToast } = useToast();
  const [input, setInput] = useState(SAMPLE);

  const stats = useMemo(() => computeCharStats(input), [input]);

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text);
      showToast('Pasted from clipboard');
    } catch {
      showToast('Clipboard access denied', { type: 'error' });
    }
  };

  const cards: { label: string; value: number; hint: string }[] = [
    { label: 'Characters', value: stats.characters, hint: 'Unicode code points' },
    {
      label: 'No spaces',
      value: stats.charactersNoSpaces,
      hint: 'All whitespace removed',
    },
    { label: 'Words', value: stats.words, hint: 'Split on whitespace' },
    { label: 'Lines', value: stats.lines, hint: 'Including trailing newline' },
    { label: 'UTF-8 bytes', value: stats.utf8Bytes, hint: 'TextEncoder byte length' },
  ];

  return (
    <div className="h-full flex flex-col min-h-0 bg-canvas">
      {/* Live stats */}
      <div className="shrink-0 border-b border-hairline px-4 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {cards.map((c) => (
            <div
              key={c.label}
              className="rounded-md border border-hairline bg-canvas-soft px-3 py-3"
            >
              <div className="text-[10px] font-semibold uppercase tracking-[2px] text-mute">
                {c.label}
              </div>
              <div className="mt-1 text-2xl font-semibold text-ink-strong font-mono tabular-nums tracking-tight">
                {c.value.toLocaleString()}
              </div>
              <div className="mt-0.5 text-[11px] text-mute">{c.hint}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="h-10 px-3 flex items-center justify-between border-b border-hairline shrink-0">
          <span className="text-[10px] font-semibold uppercase tracking-[2px] text-mute flex items-center gap-1.5">
            <Type className="w-3 h-3" />
            Text
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
          placeholder="Type or paste text — counts update live…"
          spellCheck={false}
          className="flex-1 w-full resize-none bg-canvas text-ink text-sm font-mono p-4 focus:outline-none placeholder-mute"
        />
      </div>
    </div>
  );
};
