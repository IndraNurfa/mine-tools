/** Request model shared by the API Client and cURL Runner, plus the sender. */

export interface KV {
  key: string;
  value: string;
  enabled: boolean;
}
export type BodyMode = 'none' | 'json' | 'text' | 'urlencoded' | 'form-data';
export interface ApiRequest {
  method: string;
  /** Full URL as typed, including any query string. */
  url: string;
  headers: KV[];
  auth: { type: 'none' | 'basic' | 'bearer'; username: string; password: string; token: string };
  bodyMode: BodyMode;
  /** Raw body for json/text. */
  body: string;
  /** Fields for urlencoded / form-data. */
  form: KV[];
}

export const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export function emptyRequest(): ApiRequest {
  return {
    method: 'GET',
    url: '',
    headers: [],
    auth: { type: 'none', username: '', password: '', token: '' },
    bodyMode: 'none',
    body: '',
    form: [],
  };
}

export const kv = (key: string, value: string, enabled = true): KV => ({ key, value, enabled });

// ----------------------------------------------------------- query string

/** String-based so half-typed URLs keep working. Returns decoded pairs. */
export function getQuery(url: string): [string, string][] {
  const noHash = url.split('#')[0]!;
  const i = noHash.indexOf('?');
  if (i < 0) return [];
  return noHash
    .slice(i + 1)
    .split('&')
    .filter(Boolean)
    .map((p) => {
      const j = p.indexOf('=');
      const dec = (s: string) => {
        try {
          return decodeURIComponent(s.replace(/\+/g, ' '));
        } catch {
          return s;
        }
      };
      return j < 0 ? [dec(p), ''] : [dec(p.slice(0, j)), dec(p.slice(j + 1))];
    });
}

export function setQuery(url: string, params: [string, string][]): string {
  const hashAt = url.indexOf('#');
  const hash = hashAt >= 0 ? url.slice(hashAt) : '';
  const noHash = hashAt >= 0 ? url.slice(0, hashAt) : url;
  const base = noHash.split('?')[0]!;
  const qs = params
    .filter(([k]) => k !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return base + (qs ? '?' + qs : '') + hash;
}

// -------------------------------------------------------------- variables

const VAR_RE = /\{\{\s*([\w.-]+)\s*\}\}/g;

export function findVars(req: ApiRequest): string[] {
  const text = JSON.stringify([req.url, req.headers, req.body, req.form, req.auth]);
  return [...new Set([...text.matchAll(VAR_RE)].map((m) => m[1]!))];
}

export function applyVars(req: ApiRequest, vars: Record<string, string>): ApiRequest {
  const sub = (s: string) => s.replace(VAR_RE, (m, name: string) => (vars[name] !== undefined && vars[name] !== '' ? vars[name]! : m));
  const subKv = (l: KV[]) => l.map((x) => ({ ...x, key: sub(x.key), value: sub(x.value) }));
  return {
    ...req,
    url: sub(req.url),
    headers: subKv(req.headers),
    form: subKv(req.form),
    body: sub(req.body),
    auth: { ...req.auth, username: sub(req.auth.username), password: sub(req.auth.password), token: sub(req.auth.token) },
  };
}

// ------------------------------------------------------------------ build

export interface BuiltRequest {
  method: string;
  url: string;
  headers: [string, string][];
  /** string | FormData | undefined */
  body?: string | FormData;
  /** Human-readable body for display/codegen. */
  bodyText: string;
}

export function normalizeUrl(url: string): string {
  const u = url.trim();
  if (!u) return u;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(u)) return u;
  return (/^(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(u) ? 'http://' : 'https://') + u.replace(/^\/\//, '');
}

const hasHeader = (h: [string, string][], name: string) => h.some(([k]) => k.toLowerCase() === name);

export function buildRequest(req: ApiRequest): BuiltRequest {
  const method = req.method.toUpperCase();
  const headers: [string, string][] = req.headers.filter((h) => h.enabled && h.key.trim()).map((h) => [h.key.trim(), h.value]);

  if (!hasHeader(headers, 'authorization')) {
    if (req.auth.type === 'basic') {
      const raw = new TextEncoder().encode(`${req.auth.username}:${req.auth.password}`);
      headers.push(['Authorization', 'Basic ' + btoa(String.fromCharCode(...raw))]);
    } else if (req.auth.type === 'bearer' && req.auth.token) {
      headers.push(['Authorization', `Bearer ${req.auth.token}`]);
    }
  }

  let body: string | FormData | undefined;
  let bodyText = '';
  const canHaveBody = method !== 'GET' && method !== 'HEAD';
  const fields = req.form.filter((f) => f.enabled && f.key !== '');
  if (canHaveBody) {
    if (req.bodyMode === 'json' || req.bodyMode === 'text') {
      if (req.body !== '') {
        body = bodyText = req.body;
        if (req.bodyMode === 'json' && !hasHeader(headers, 'content-type')) headers.push(['Content-Type', 'application/json']);
      }
    } else if (req.bodyMode === 'urlencoded') {
      body = bodyText = fields.map((f) => `${encodeURIComponent(f.key)}=${encodeURIComponent(f.value)}`).join('&');
      if (!hasHeader(headers, 'content-type')) headers.push(['Content-Type', 'application/x-www-form-urlencoded']);
    } else if (req.bodyMode === 'form-data') {
      const fd = new FormData();
      for (const f of fields) fd.append(f.key, f.value);
      body = fd;
      bodyText = fields.map((f) => `${f.key}=${f.value}`).join('\n');
    }
  }
  return { method, url: normalizeUrl(req.url), headers, body, bodyText };
}

// ------------------------------------------------------------------- send

export interface ApiResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: [string, string][];
  body: string;
  contentType: string;
  bytes: number;
  timeMs: number;
  url: string;
  redirected: boolean;
  /** Body was binary and not shown as text. */
  binary: boolean;
  error?: string;
}

const TEXTUAL = /(text|json|xml|javascript|html|csv|yaml|x-www-form-urlencoded|svg)/i;

export async function sendRequest(
  req: ApiRequest,
  opts: { fetchImpl?: typeof fetch; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<ApiResponse> {
  const fail = (error: string, t0: number): ApiResponse => ({
    ok: false, status: 0, statusText: '', headers: [], body: '', contentType: '', bytes: 0,
    timeMs: Math.round(performance.now() - t0), url: req.url, redirected: false, binary: false, error,
  });
  const t0 = performance.now();
  const built = buildRequest(req);
  if (!built.url) return fail('Enter a URL first.', t0);
  try {
    new URL(built.url);
  } catch {
    return fail(`Invalid URL: ${built.url}`, t0);
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error('timeout')), opts.timeoutMs ?? 30_000);
  opts.signal?.addEventListener('abort', () => ctrl.abort());
  try {
    const f = opts.fetchImpl ?? fetch;
    const res = await f(built.url, {
      method: built.method,
      headers: built.headers,
      body: built.body,
      signal: ctrl.signal,
    });
    const buf = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') ?? '';
    const binary = contentType !== '' && !TEXTUAL.test(contentType);
    return {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      headers: [...res.headers.entries()],
      body: binary ? '' : new TextDecoder().decode(buf),
      contentType,
      bytes: buf.byteLength,
      timeMs: Math.round(performance.now() - t0),
      url: res.url || built.url,
      redirected: res.redirected,
      binary,
    };
  } catch (e) {
    const err = e as Error;
    if (ctrl.signal.aborted) return fail(opts.signal?.aborted ? 'Request cancelled.' : 'Request timed out.', t0);
    const isNet = err instanceof TypeError;
    return fail(
      isNet
        ? `${err.message}. The browser blocked or could not complete the request — usually CORS (the server must send Access-Control-Allow-Origin), mixed content (https page → http URL), or the host is unreachable.`
        : err.message,
      t0,
    );
  } finally {
    clearTimeout(timer);
  }
}
