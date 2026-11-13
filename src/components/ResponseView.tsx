import React, { useMemo, useState } from 'react';
import type { ApiResponse } from '../core/http/request.ts';
import { PaneHeader, Segmented } from './ui.tsx';
import { formatBytes } from '../core/format/formatter.ts';

const statusTone = (s: number) =>
  s === 0 ? 'text-red-400 border-red-400/40 bg-red-400/10'
  : s < 300 ? 'text-primary border-primary/40 bg-primary/10'
  : s < 400 ? 'text-blue-400 border-blue-400/40 bg-blue-400/10'
  : s < 500 ? 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10'
  : 'text-red-400 border-red-400/40 bg-red-400/10';

const MAX_SHOWN = 1_000_000;

export const ResponseView: React.FC<{ res: ApiResponse | null; loading: boolean }> = ({ res, loading }) => {
  const [tab, setTab] = useState<'body' | 'headers'>('body');
  const [raw, setRaw] = useState(false);

  const shown = useMemo(() => {
    if (!res || res.binary) return '';
    if (!raw) {
      try {
        return JSON.stringify(JSON.parse(res.body), null, 2);
      } catch {
        /* not JSON */
      }
    }
    return res.body;
  }, [res, raw]);

  if (loading) return <div className="p-6 text-sm text-mute animate-pulse">Sending…</div>;
  if (!res) return <div className="p-6 text-sm text-mute">Hit Send to see the response.</div>;

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="shrink-0 px-3 py-2 flex flex-wrap items-center gap-3 border-b border-hairline text-xs">
        <span className={`px-2 py-1 rounded-pill border font-mono font-semibold ${statusTone(res.status)}`}>
          {res.status === 0 ? 'ERROR' : `${res.status} ${res.statusText}`}
        </span>
        <span className="font-mono text-mute">{res.timeMs} ms</span>
        <span className="font-mono text-mute">{formatBytes(res.bytes)}</span>
        {res.redirected && <span className="text-mute">redirected → {res.url}</span>}
        <div className="ml-auto flex items-center gap-2">
          <Segmented
            value={tab}
            options={[
              { id: 'body', label: 'Body' },
              { id: 'headers', label: `Headers (${res.headers.length})` },
            ]}
            onChange={setTab}
          />
        </div>
      </div>
      {res.error ? (
        <div className="p-4 text-sm text-red-400 leading-relaxed">{res.error}</div>
      ) : tab === 'headers' ? (
        <div className="flex-1 min-h-0 overflow-auto p-3 font-mono text-xs space-y-1">
          {res.headers.map(([k, v], i) => (
            <div key={i} className="flex gap-3">
              <span className="text-primary-soft shrink-0">{k}</span>
              <span className="text-ink break-all">{v}</span>
            </div>
          ))}
        </div>
      ) : (
        <>
          <PaneHeader
            title={res.contentType || 'body'}
            copyText={shown}
            extra={
              <button type="button" onClick={() => setRaw(!raw)} className="text-[11px] text-mute hover:text-ink mr-2">
                {raw ? 'Pretty' : 'Raw'}
              </button>
            }
          />
          {res.binary ? (
            <div className="p-4 text-sm text-mute">Binary response ({res.contentType}, {formatBytes(res.bytes)}) — not shown.</div>
          ) : (
            <pre className="flex-1 min-h-0 overflow-auto p-3 text-xs font-mono text-ink whitespace-pre-wrap break-all">
              {shown.slice(0, MAX_SHOWN)}
              {shown.length > MAX_SHOWN && '\n… truncated for display'}
            </pre>
          )}
        </>
      )}
    </div>
  );
};
