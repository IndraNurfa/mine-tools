import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Send, Square, Terminal as TerminalIcon } from 'lucide-react';
import {
  METHODS, applyVars, emptyRequest, findVars, getQuery, kv, sendRequest, setQuery,
  type ApiRequest, type ApiResponse, type BodyMode,
} from '../../core/http/request.ts';
import { CODE_TARGETS, generateCode, parseCurl, type CodeTarget } from '../../core/http/curl.ts';
import { KvEditor } from '../../components/KvEditor.tsx';
import { ResponseView } from '../../components/ResponseView.tsx';
import { VarsPanel } from '../../components/VarsPanel.tsx';
import { PaneHeader, Segmented, TextBtn, inputCls, textareaCls, useCopy } from '../../components/ui.tsx';
import { usePersistentState } from '../../lib/storage.ts';

interface HistoryItem {
  id: string;
  at: number;
  status: number;
  req: ApiRequest;
}
type Tab = 'params' | 'headers' | 'auth' | 'body' | 'vars' | 'history' | 'curl';

const HEADER_NAMES = ['Accept', 'Authorization', 'Content-Type', 'Cache-Control', 'User-Agent', 'X-Requested-With', 'Origin', 'Referer', 'Cookie', 'If-None-Match'];
const METHOD_TONE: Record<string, string> = { GET: 'text-primary', POST: 'text-yellow-400', PUT: 'text-blue-400', PATCH: 'text-purple-400', DELETE: 'text-red-400' };

export const ApiClientTool: React.FC = () => {
  const [req, setReq] = usePersistentState<ApiRequest>('api-client', 'request', emptyRequest);
  const [vars, setVars] = usePersistentState<Record<string, string>>('api-client', 'vars', {});
  const [history, setHistory] = usePersistentState<HistoryItem[]>('api-client', 'history', []);
  const [tab, setTab] = usePersistentState<Tab>('api-client', 'tab', 'params');
  const [target, setTarget] = usePersistentState<CodeTarget>('api-client', 'target', 'curl');
  const [res, setRes] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [curlText, setCurlText] = useState('');
  const [curlError, setCurlError] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const copy = useCopy();

  const patch = useCallback((p: Partial<ApiRequest>) => setReq((r) => ({ ...r, ...p })), [setReq]);
  const names = useMemo(() => findVars(req), [req]);
  const resolved = useMemo(() => applyVars(req, vars), [req, vars]);
  const params = useMemo(() => getQuery(req.url), [req.url]);
  const enabledHeaders = req.headers.filter((h) => h.enabled && h.key).length;

  const send = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    const r = await sendRequest(resolved, { signal: ctrl.signal });
    if (abortRef.current === ctrl) {
      setRes(r);
      setLoading(false);
      setHistory((h) => [{ id: Math.random().toString(36).slice(2, 9), at: Date.now(), status: r.status, req }, ...h].slice(0, 25));
    }
  }, [resolved, req, setHistory]);

  const cancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  };

  const importCurl = () => {
    try {
      const { request, notes } = parseCurl(curlText);
      setReq(request);
      setCurlError(notes.length ? `Imported. Note: ${notes.join('; ')}` : '');
      setCurlText('');
      setTab('params');
    } catch (e) {
      setCurlError((e as Error).message);
    }
  };

  const tabBtn = (id: Tab, label: string, badge?: number) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      className={`px-3 py-2 text-xs border-b-2 transition-colors ${tab === id ? 'border-primary text-primary' : 'border-transparent text-mute hover:text-ink'}`}
    >
      {label}
      {badge ? <span className="ml-1.5 font-mono text-[11px] text-primary-soft">{badge}</span> : null}
    </button>
  );

  return (
    <div
      className="h-full flex flex-col min-h-0 bg-canvas"
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          send();
        }
      }}
    >
      {/* URL bar */}
      <div className="shrink-0 border-b border-hairline px-4 py-3 flex items-center gap-2">
        <select
          value={req.method}
          onChange={(e) => patch({ method: e.target.value })}
          className={`${inputCls} py-2 font-semibold ${METHOD_TONE[req.method] ?? 'text-ink'}`}
        >
          {METHODS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <input
          autoFocus
          value={req.url}
          onChange={(e) => patch({ url: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && !e.metaKey && !e.ctrlKey && send()}
          spellCheck={false}
          placeholder="https://api.example.com/v1/users?limit=10   (or paste a cURL under the cURL tab)"
          className={`${inputCls} flex-1 text-sm py-2`}
        />
        {loading ? (
          <TextBtn onClick={cancel}>
            <Square className="w-3.5 h-3.5" /> Cancel
          </TextBtn>
        ) : (
          <TextBtn primary onClick={send}>
            <Send className="w-3.5 h-3.5" /> Send
          </TextBtn>
        )}
      </div>

      <div className="flex-1 min-h-0 grid grid-rows-2 xl:grid-rows-1 xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x divide-hairline">
        {/* Request editor */}
        <div className="flex flex-col min-h-0">
          <div className="shrink-0 flex items-center border-b border-hairline px-2 overflow-x-auto">
            {tabBtn('params', 'Params', params.length)}
            {tabBtn('headers', 'Headers', enabledHeaders)}
            {tabBtn('auth', 'Auth')}
            {tabBtn('body', 'Body')}
            {tabBtn('vars', 'Variables', names.length)}
            {tabBtn('curl', 'cURL')}
            {tabBtn('history', 'History', history.length)}
          </div>
          <div className="flex-1 min-h-0 overflow-auto p-4">
            {tab === 'params' && (
              <KvEditor
                items={params.map(([k, v]) => kv(k, v))}
                onChange={(items) => patch({ url: setQuery(req.url, items.map((i) => [i.key, i.value]) as [string, string][]) })}
                keyPlaceholder="param"
                empty="No query parameters. Add one here, or type ?key=value straight into the URL."
              />
            )}
            {tab === 'headers' && (
              <KvEditor items={req.headers} onChange={(headers) => patch({ headers })} keyPlaceholder="Header" suggestions={HEADER_NAMES} empty="No headers. Content-Type is added automatically for JSON bodies." />
            )}
            {tab === 'auth' && (
              <div className="space-y-3">
                <Segmented
                  value={req.auth.type}
                  options={[
                    { id: 'none', label: 'None' },
                    { id: 'bearer', label: 'Bearer token' },
                    { id: 'basic', label: 'Basic' },
                  ]}
                  onChange={(type) => patch({ auth: { ...req.auth, type } })}
                />
                {req.auth.type === 'bearer' && (
                  <input value={req.auth.token} onChange={(e) => patch({ auth: { ...req.auth, token: e.target.value } })} placeholder="token" spellCheck={false} className={`${inputCls} w-full py-2.5`} />
                )}
                {req.auth.type === 'basic' && (
                  <div className="flex gap-2">
                    <input value={req.auth.username} onChange={(e) => patch({ auth: { ...req.auth, username: e.target.value } })} placeholder="username" className={`${inputCls} flex-1`} />
                    <input value={req.auth.password} onChange={(e) => patch({ auth: { ...req.auth, password: e.target.value } })} placeholder="password" className={`${inputCls} flex-1`} />
                  </div>
                )}
                <p className="text-xs text-mute">Adds an Authorization header unless you set one yourself under Headers.</p>
              </div>
            )}
            {tab === 'body' && (
              <div className="h-full flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Segmented
                    value={req.bodyMode}
                    options={[
                      { id: 'none', label: 'None' },
                      { id: 'json', label: 'JSON' },
                      { id: 'text', label: 'Text' },
                      { id: 'urlencoded', label: 'x-www-form-urlencoded' },
                      { id: 'form-data', label: 'form-data' },
                    ]}
                    onChange={(bodyMode: BodyMode) => patch({ bodyMode })}
                  />
                  {req.bodyMode === 'json' && (
                    <TextBtn
                      onClick={() => {
                        try {
                          patch({ body: JSON.stringify(JSON.parse(req.body), null, 2) });
                        } catch {
                          /* leave as is */
                        }
                      }}
                    >
                      Beautify
                    </TextBtn>
                  )}
                  {(req.method === 'GET' || req.method === 'HEAD') && req.bodyMode !== 'none' && (
                    <span className="text-xs text-yellow-400">{req.method} requests are sent without a body.</span>
                  )}
                </div>
                {(req.bodyMode === 'json' || req.bodyMode === 'text') && (
                  <textarea
                    value={req.body}
                    onChange={(e) => patch({ body: e.target.value })}
                    spellCheck={false}
                    placeholder={req.bodyMode === 'json' ? '{\n  "name": "value"\n}' : 'raw text body'}
                    className={`${textareaCls} border border-hairline rounded-sm min-h-[120px]`}
                  />
                )}
                {(req.bodyMode === 'urlencoded' || req.bodyMode === 'form-data') && (
                  <KvEditor items={req.form} onChange={(form) => patch({ form })} />
                )}
              </div>
            )}
            {tab === 'vars' && (
              <div>
                <VarsPanel names={names} values={vars} onChange={setVars} />
              </div>
            )}
            {tab === 'curl' && (
              <div className="h-full flex flex-col gap-3">
                <div className="flex flex-col gap-2 flex-1 min-h-[110px]">
                  <PaneHeader title="Import from cURL" onClear={() => setCurlText('')} />
                  <textarea
                    value={curlText}
                    onChange={(e) => setCurlText(e.target.value)}
                    spellCheck={false}
                    placeholder={"curl 'https://api.example.com' -H 'accept: application/json' ..."}
                    className={`${textareaCls} border border-hairline rounded-sm`}
                  />
                  <div className="flex items-center gap-3">
                    <TextBtn primary onClick={importCurl}>
                      <TerminalIcon className="w-3.5 h-3.5" /> Import (replaces current request)
                    </TextBtn>
                    {curlError && <span className={`text-xs ${curlError.startsWith('Imported') ? 'text-yellow-400' : 'text-red-400'}`}>{curlError}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-mute">Copy request as</span>
                  <Segmented value={target} options={CODE_TARGETS} onChange={setTarget} />
                  <TextBtn onClick={() => copy(generateCode(resolved, target), 'Code copied')}>Copy</TextBtn>
                </div>
                <pre className="max-h-40 overflow-auto p-3 rounded-sm border border-hairline bg-canvas-soft text-xs font-mono text-ink whitespace-pre-wrap break-all">
                  {resolved.url ? generateCode(resolved, target) : 'Enter a URL to preview code.'}
                </pre>
              </div>
            )}
            {tab === 'history' && (
              <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(100%,480px),1fr))] content-start">
                {history.length === 0 && <div className="text-sm text-mute col-span-full">Nothing sent yet.</div>}
                {history.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => {
                      setReq(h.req);
                      setTab('params');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md border border-hairline bg-canvas-soft hover:border-primary/40 text-left text-xs font-mono"
                  >
                    <span className={`w-14 font-semibold ${METHOD_TONE[h.req.method] ?? 'text-ink'}`}>{h.req.method}</span>
                    <span className="flex-1 truncate text-ink">{h.req.url}</span>
                    <span className={h.status === 0 || h.status >= 400 ? 'text-red-400' : 'text-primary'}>{h.status || 'ERR'}</span>
                    <span className="text-mute">{new Date(h.at).toLocaleTimeString()}</span>
                  </button>
                ))}
                {history.length > 0 && <div className="col-span-full"><TextBtn onClick={() => setHistory([])}>Clear history</TextBtn></div>}
              </div>
            )}
          </div>
        </div>

        {/* Response */}
        <div className="min-h-0 bg-canvas">
          <ResponseView res={res} loading={loading} />
        </div>
      </div>
    </div>
  );
};
