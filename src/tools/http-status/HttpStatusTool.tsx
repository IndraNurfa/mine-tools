import React, { useMemo } from 'react';
import { searchStatus } from '../../core/http/statusCodes.ts';
import { AutoGrid, Page, Toolbar, inputCls, useCopy } from '../../components/ui.tsx';
import { usePersistentState } from '../../lib/storage.ts';

const CLASSES = [
  { c: '1', label: '1xx Informational', tone: 'text-mute' },
  { c: '2', label: '2xx Success', tone: 'text-primary' },
  { c: '3', label: '3xx Redirection', tone: 'text-blue-400' },
  { c: '4', label: '4xx Client error', tone: 'text-yellow-400' },
  { c: '5', label: '5xx Server error', tone: 'text-red-400' },
];

export const HttpStatusTool: React.FC = () => {
  const [q, setQ] = usePersistentState('http-status', 'q', '');
  const copy = useCopy();
  const rows = useMemo(() => searchStatus(q), [q]);

  return (
    <div className="h-full flex flex-col min-h-0 bg-canvas">
      <Toolbar>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search: 404 · teapot · redirect · rate limit"
          className={`${inputCls} flex-1 min-w-[260px] text-sm py-2`}
        />
        <div className="flex gap-1.5">
          {CLASSES.map((k) => (
            <button
              key={k.c}
              type="button"
              onClick={() => setQ(q === `${k.c}xx` ? '' : `${k.c}xx`)}
              className={`px-2.5 py-1.5 rounded-sm border text-xs font-mono transition-colors ${
                q === `${k.c}xx` ? 'border-primary/50 bg-primary/10 text-primary' : 'border-hairline bg-canvas-soft text-mute hover:text-ink'
              }`}
            >
              {k.c}xx
            </button>
          ))}
        </div>
        <span className="text-xs text-mute font-mono">{rows.length} codes</span>
      </Toolbar>
      <Page className="space-y-8">
        {CLASSES.map((k) => {
          const group = rows.filter((h) => String(h.code)[0] === k.c);
          if (!group.length) return null;
          return (
            <section key={k.c}>
              <h2 className={`mb-3 text-xs font-semibold uppercase tracking-[1.5px] ${k.tone}`}>
                {k.label} <span className="text-mute font-normal">· {group.length}</span>
              </h2>
              <AutoGrid min={340}>
                {group.map((h) => (
                  <button
                    key={h.code}
                    type="button"
                    onClick={() => copy(`${h.code} ${h.name}`, `${h.code} copied`)}
                    className="text-left flex gap-4 p-4 rounded-md border border-hairline bg-canvas-soft hover:border-primary/40 transition-colors"
                  >
                    <span className={`font-mono text-2xl font-semibold leading-none pt-0.5 w-14 shrink-0 ${k.tone}`}>{h.code}</span>
                    <span className="min-w-0">
                      <span className="block text-sm text-ink-strong font-medium">{h.name}</span>
                      <span className="block mt-1 text-[13px] leading-relaxed text-mute">{h.desc}</span>
                    </span>
                  </button>
                ))}
              </AutoGrid>
            </section>
          );
        })}
        {!rows.length && <div className="text-sm text-mute">No matches.</div>}
      </Page>
    </div>
  );
};
