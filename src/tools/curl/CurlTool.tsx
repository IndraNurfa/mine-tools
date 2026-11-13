import React, { useMemo, useRef, useState } from 'react';
import { ExternalLink, Send } from 'lucide-react';
import { applyVars, findVars, sendRequest, type ApiResponse } from '../../core/http/request.ts';
import { CODE_TARGETS, generateCode, parseCurl, type CodeTarget } from '../../core/http/curl.ts';
import { ResponseView } from '../../components/ResponseView.tsx';
import { VarsPanel } from '../../components/VarsPanel.tsx';
import { PaneHeader, Segmented, TextBtn, textareaCls, usePaste } from '../../components/ui.tsx';
import { saveStored, usePersistentState } from '../../lib/storage.ts';

const SAMPLE = `curl -X POST 'https://httpbin.org/post' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer {{token}}' \\
  -d '{"hello":"world"}'`;

export const CurlTool: React.FC = () => {
  const [input, setInput] = usePersistentState('curl', 'input', SAMPLE);
  const [vars, setVars] = usePersistentState<Record<string, string>>('curl', 'vars', {});
  const [target, setTarget] = usePersistentState<CodeTarget>('curl', 'target', 'fetch');
  const [res, setRes] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const paste = usePaste(setInput);
  const run = useRef(0);

  const parsed = useMemo(() => {
    if (!input.trim()) return null;
    try {
      return { ...parseCurl(input) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [input]);
  const ok = parsed && 'request' in parsed ? parsed : null;
  const names = useMemo(() => (ok ? findVars(ok.request) : []), [ok]);
  const resolved = useMemo(() => (ok ? applyVars(ok.request, vars) : null), [ok, vars]);

  const send = async () => {
    if (!resolved) return;
    const id = ++run.current;
    setLoading(true);
    const r = await sendRequest(resolved);
    if (run.current === id) {
      setRes(r);
      setLoading(false);
    }
  };

  const openInClient = () => {
    if (!ok) return;
    saveStored('api-client', 'request', ok.request);
    saveStored('api-client', 'vars', vars);
    window.history.pushState(null, '', '/api-client');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const req = ok?.request;
  const leftover = names.filter((n) => !vars[n]);

  return (
    <div className="h-full grid lg:grid-cols-2 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-hairline bg-canvas">
      {/* Left: paste + parsed breakdown */}
      <div className="flex flex-col min-h-0">
        <div className="h-[42%] min-h-[140px] flex flex-col border-b border-hairline">
          <PaneHeader
            title="cURL command"
            onPaste={paste}
            onClear={() => setInput('')}
            extra={parsed && 'error' in parsed ? <span className="text-xs text-red-400 mr-2">{parsed.error}</span> : undefined}
          />
          <textarea
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder="Paste a cURL command — e.g. Chrome DevTools → Network → Copy as cURL"
            className={textareaCls}
          />
        </div>
        <div className="flex-1 min-h-0 overflow-auto p-4 space-y-4 text-xs">
          {req && (
            <>
              <div className="flex items-center gap-2 font-mono">
                <span className="px-2 py-1 rounded-sm bg-primary/15 text-primary font-semibold">{req.method}</span>
                <span className="text-ink break-all">{req.url}</span>
              </div>
              {req.headers.length > 0 && (
                <div className="space-y-1 font-mono">
                  <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-mute font-sans">Headers</div>
                  {req.headers.map((h, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="text-primary-soft shrink-0">{h.key}</span>
                      <span className="text-body break-all">{h.value}</span>
                    </div>
                  ))}
                </div>
              )}
              {req.auth.type === 'basic' && <div className="font-mono text-body">Basic auth: {req.auth.username}:••••</div>}
              {(req.body || req.form.length > 0) && (
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-mute">Body · {req.bodyMode}</div>
                  <pre className="p-2 rounded-sm border border-hairline bg-canvas-soft font-mono text-ink whitespace-pre-wrap break-all">
                    {req.bodyMode === 'form-data' ? req.form.map((f) => `${f.key}=${f.value}`).join('\n') : req.body}
                  </pre>
                </div>
              )}
              {ok!.notes.length > 0 && <div className="text-yellow-400">Note: {ok!.notes.join('; ')}</div>}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-mute">Variables</div>
                <VarsPanel names={names} values={vars} onChange={setVars} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: converted code + send */}
      <div className="flex flex-col min-h-0">
        <div className="shrink-0 border-b border-hairline px-4 py-3 flex flex-wrap items-center gap-3">
          <Segmented value={target} options={CODE_TARGETS} onChange={setTarget} />
          <span className="ml-auto flex items-center gap-2">
            <TextBtn onClick={openInClient}>
              <ExternalLink className="w-3.5 h-3.5" /> Open in API Client
            </TextBtn>
            <TextBtn primary onClick={send}>
              <Send className="w-3.5 h-3.5" /> {loading ? 'Sending…' : 'Send'}
            </TextBtn>
          </span>
        </div>
        <div className="h-[36%] min-h-[120px] flex flex-col border-b border-hairline">
          <PaneHeader title={`Converted · ${CODE_TARGETS.find((t) => t.id === target)!.label}`} copyText={resolved ? generateCode(resolved, target) : ''} />
          <pre className="flex-1 min-h-0 overflow-auto p-3 text-xs font-mono text-ink whitespace-pre-wrap break-all">
            {resolved ? generateCode(resolved, target) : <span className="text-mute">Waiting for a valid cURL…</span>}
          </pre>
        </div>
        {leftover.length > 0 && (
          <div className="px-4 py-2 text-xs text-yellow-400 border-b border-hairline">
            Unfilled variables will be sent literally: {leftover.map((n) => `{{${n}}}`).join(', ')}
          </div>
        )}
        <div className="flex-1 min-h-0">
          <ResponseView res={res} loading={loading} />
        </div>
      </div>
    </div>
  );
};
