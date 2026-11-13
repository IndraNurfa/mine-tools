import React, { useMemo, useState } from 'react';
import { usePersistentState } from '../../lib/storage.ts';
import { runRegex, runReplace } from '../../core/regex/regexTest.ts';
import { Check, PaneHeader, Toolbar, inputCls, textareaCls, usePaste } from '../../components/ui.tsx';

const FLAGS = [
  { f: 'g', label: 'g global' },
  { f: 'i', label: 'i ignore case' },
  { f: 'm', label: 'm multiline' },
  { f: 's', label: 's dotAll' },
  { f: 'u', label: 'u unicode' },
];

export const RegexTool: React.FC = () => {
  const [pattern, setPattern] = usePersistentState('regex', 'pattern', '(?<key>\\w+)=(\\d+)');
  const [flags, setFlags] = usePersistentState('regex', 'flags', 'g');
  const [text, setText] = usePersistentState('regex', 'text', 'a=1, b=22, c=333');
  const [replacement, setReplacement] = usePersistentState('regex', 'replacement', '');
  const paste = usePaste(setText);

  const result = useMemo(() => runRegex(pattern, flags, text), [pattern, flags, text]);
  const replaced = useMemo(
    () => (replacement ? runReplace(pattern, flags, text, replacement) : ''),
    [pattern, flags, text, replacement],
  );

  const toggle = (f: string, on: boolean) =>
    setFlags((cur) => (on ? cur + f : cur.replace(f, '')));

  // Build highlighted segments
  const segments = useMemo(() => {
    const out: { t: string; hit: boolean }[] = [];
    let pos = 0;
    for (const m of result.matches) {
      if (m.end === m.index) continue;
      if (m.index > pos) out.push({ t: text.slice(pos, m.index), hit: false });
      out.push({ t: text.slice(m.index, m.end), hit: true });
      pos = m.end;
    }
    if (pos < text.length) out.push({ t: text.slice(pos), hit: false });
    return out;
  }, [result, text]);

  return (
    <div className="h-full flex flex-col min-h-0 bg-canvas">
      <Toolbar>
        <div className="flex items-center gap-1 flex-1 min-w-[280px]">
          <span className="font-mono text-mute">/</span>
          <input
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            spellCheck={false}
            placeholder="pattern"
            className={`${inputCls} flex-1 text-sm py-2`}
          />
          <span className="font-mono text-mute">/{flags}</span>
        </div>
        {FLAGS.map(({ f, label }) => (
          <Check key={f} checked={flags.includes(f)} onChange={(on) => toggle(f, on)}>
            {label}
          </Check>
        ))}
      </Toolbar>
      {result.error && (
        <div className="px-4 py-2 text-xs text-red-400 border-b border-hairline font-mono">{result.error}</div>
      )}
      <div className="flex-1 min-h-0 grid grid-rows-2 lg:grid-rows-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-hairline">
        <div className="flex flex-col min-h-0">
          <PaneHeader title="Test string" onPaste={paste} onClear={() => setText('')} />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            className={textareaCls}
          />
        </div>
        <div className="flex flex-col min-h-0">
          <PaneHeader
            title={`Matches · ${result.matches.length}${result.truncated ? '+' : ''}`}
          />
          <div className="flex-1 min-h-0 overflow-auto p-4 space-y-4">
            <pre className="font-mono text-sm text-body whitespace-pre-wrap break-words">
              {segments.map((s, i) =>
                s.hit ? (
                  <mark key={i} className="bg-primary/25 text-primary-soft rounded-xs">
                    {s.t}
                  </mark>
                ) : (
                  <span key={i}>{s.t}</span>
                ),
              )}
            </pre>
            <div className="space-y-1.5">
              {result.matches.slice(0, 200).map((m, i) => (
                <div
                  key={i}
                  className="rounded-sm border border-hairline bg-canvas-soft px-3 py-2 font-mono text-xs"
                >
                  <div className="flex gap-3">
                    <span className="text-mute">#{i + 1}</span>
                    <span className="text-ink break-all">{JSON.stringify(m.text)}</span>
                    <span className="text-mute ml-auto shrink-0">
                      {m.index}–{m.end}
                    </span>
                  </div>
                  {m.groups.map((g, gi) => (
                    <div key={gi} className="text-mute pl-8">
                      ${gi + 1}: <span className="text-body">{g === undefined ? 'undefined' : JSON.stringify(g)}</span>
                    </div>
                  ))}
                  {Object.entries(m.named).map(([k, v]) => (
                    <div key={k} className="text-mute pl-8">
                      &lt;{k}&gt;: <span className="text-body">{v === undefined ? 'undefined' : JSON.stringify(v)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-hairline space-y-2">
              <input
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                placeholder="Replacement ($1, $<name>, $&)…"
                className={`${inputCls} w-full`}
              />
              {replacement && (
                <pre className="font-mono text-sm text-ink whitespace-pre-wrap break-words">{replaced}</pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
