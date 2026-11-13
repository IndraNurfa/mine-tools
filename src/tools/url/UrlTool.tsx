import React, { useMemo } from 'react';
import { Plus, X } from 'lucide-react';
import { parseUrl, withParams } from '../../core/url/url.ts';
import { CopyRow, PaneHeader, TextBtn, inputCls, textareaCls, usePaste } from '../../components/ui.tsx';
import { usePersistentState } from '../../lib/storage.ts';

export const UrlTool: React.FC = () => {
  const [input, setInput] = usePersistentState(
    'url',
    'input',
    'https://user:pw@example.com:8080/path/to/page?utm_source=news&q=hello%20world&tag=a&tag=b#section',
  );
  const paste = usePaste(setInput);

  const parsed = useMemo(() => {
    try {
      return { url: parseUrl(input) };
    } catch (e) {
      return input.trim() ? { error: (e as Error).message } : {};
    }
  }, [input]);
  const u = 'url' in parsed ? parsed.url : null;

  const setParams = (params: [string, string][]) => {
    if (u) setInput(withParams(u.href, params));
  };

  return (
    <div className="h-full flex flex-col min-h-0 bg-canvas">
      <div className="h-[28%] min-h-[110px] flex flex-col border-b border-hairline">
        <PaneHeader
          title="URL"
          onPaste={paste}
          onClear={() => setInput('')}
          extra={'error' in parsed ? <span className="text-xs text-red-400 mr-2">{parsed.error}</span> : undefined}
        />
        <textarea
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          className={textareaCls}
        />
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-4 grid lg:grid-cols-2 gap-6 content-start">
        {u && (
          <>
            <div className="space-y-2">
              <CopyRow label="Protocol" value={u.protocol} />
              <CopyRow label="Username" value={u.username} />
              <CopyRow label="Password" value={u.password} />
              <CopyRow label="Host" value={u.hostname} />
              <CopyRow label="Port" value={u.port} />
              <CopyRow label="Path" value={u.pathname} />
              <CopyRow label="Hash" value={u.hash} />
              <CopyRow label="Origin" value={new URL(u.href).origin} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-mute">
                  Query params · {u.params.length}
                </span>
                <TextBtn onClick={() => setParams([...u.params, ['key', 'value']])}>
                  <Plus className="w-3.5 h-3.5" /> Add
                </TextBtn>
              </div>
              {u.params.map(([k, v], i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={k}
                    onChange={(e) => setParams(u.params.map((p, j) => (j === i ? [e.target.value, p[1]] : p)))}
                    className={`${inputCls} w-2/5`}
                  />
                  <input
                    value={v}
                    onChange={(e) => setParams(u.params.map((p, j) => (j === i ? [p[0], e.target.value] : p)))}
                    className={`${inputCls} flex-1`}
                  />
                  <button
                    type="button"
                    title="Remove"
                    onClick={() => setParams(u.params.filter((_, j) => j !== i))}
                    className="p-1.5 text-mute hover:text-red-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {!u.params.length && <div className="text-sm text-mute">No query string.</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
