import { describe, it, expect } from 'vitest';
import { shellSplit, parseCurl, toCurl, toFetch, toPython, toAxios } from '../http/curl.ts';
import { applyVars, buildRequest, emptyRequest, findVars, getQuery, kv, sendRequest, setQuery, normalizeUrl } from '../http/request.ts';

describe('shellSplit', () => {
  it('handles quotes, escapes and continuations', () => {
    expect(shellSplit(`curl 'a b' "c \\"d\\"" e\\ f \\\n  g`)).toEqual(['curl', 'a b', 'c "d"', 'e f', 'g']);
    expect(shellSplit(`-d $'{"a":"x\\ny","u":"\\u00e9"}'`)).toEqual(['-d', '{"a":"x\ny","u":"é"}']);
    expect(shellSplit(`'' x`)).toEqual(['', 'x']);
  });
});

describe('parseCurl', () => {
  it('parses a Chrome-style command', () => {
    const { request: r } = parseCurl(`curl 'https://api.x.com/v1/users?id=1' \\
  -H 'accept: application/json' \\
  -H 'content-type: application/json' \\
  --data-raw '{"name":"Ann"}' \\
  --compressed`);
    expect(r.method).toBe('POST');
    expect(r.url).toBe('https://api.x.com/v1/users?id=1');
    expect(r.bodyMode).toBe('json');
    expect(r.body).toBe('{"name":"Ann"}');
    expect(r.headers.map((h) => h.key)).toEqual(['accept', 'content-type']);
  });
  it('explicit method, clusters and attached values', () => {
    expect(parseCurl('curl -sSL -XDELETE https://a.com/1').request.method).toBe('DELETE');
    expect(parseCurl(`curl -H'X-A: 1' https://a.com`).request.headers[0]).toMatchObject({ key: 'X-A', value: '1' });
    expect(parseCurl('curl -I https://a.com').request.method).toBe('HEAD');
    expect(parseCurl('https://a.com --url https://b.com').request.url).toBe('https://b.com');
  });
  it('auth, cookies, user agent', () => {
    const r = parseCurl('curl -u bob:pw -b "s=1" -A UA https://a.com').request;
    expect(r.auth).toMatchObject({ type: 'basic', username: 'bob', password: 'pw' });
    expect(r.headers.map((h) => h.key)).toEqual(['Cookie', 'User-Agent']);
    expect(parseCurl('curl --oauth2-bearer TOK https://a.com').request.auth.token).toBe('TOK');
  });
  it('default content type for -d, multiple -d joined, -G moves data to query', () => {
    const r = parseCurl('curl -d a=1 -d b=2 https://a.com').request;
    expect(r.body).toBe('a=1&b=2');
    expect(r.headers.find((h) => h.key === 'Content-Type')!.value).toBe('application/x-www-form-urlencoded');
    expect(parseCurl('curl -G -d q=1 https://a.com').request).toMatchObject({ url: 'https://a.com?q=1', method: 'GET' });
    expect(parseCurl('curl --data-urlencode "q=a b&c" https://a.com').request.body).toBe('q=a%20b%26c');
  });
  it('--json and -F', () => {
    const j = parseCurl(`curl --json '{"a":1}' https://a.com`).request;
    expect(j).toMatchObject({ method: 'POST', bodyMode: 'json' });
    expect(j.headers.map((h) => h.key)).toEqual(['Content-Type', 'Accept']);
    const f = parseCurl('curl -F a=1 -F "b=x y" https://a.com');
    expect(f.request.bodyMode).toBe('form-data');
    expect(f.request.form).toHaveLength(2);
    expect(parseCurl('curl -F file=@a.png https://a.com').notes.join()).toMatch(/file uploads/);
  });
  it('errors', () => {
    expect(() => parseCurl('')).toThrow();
    expect(() => parseCurl('curl -X POST')).toThrow(/No URL/);
    expect(() => parseCurl('ls -la')).toThrow(/does not look/);
  });
  it('notes unsupported flags', () => {
    expect(parseCurl('curl -k --proxy http://p https://a.com').notes.length).toBe(2);
  });
});

describe('request building', () => {
  it('query helpers round-trip', () => {
    expect(getQuery('https://a.com/p?x=1&y=a%20b+c#h')).toEqual([['x', '1'], ['y', 'a b c']]);
    expect(setQuery('https://a.com/p?x=1#h', [['a', 'b c'], ['', 'x']])).toBe('https://a.com/p?a=b%20c#h');
    expect(setQuery('a.com', [])).toBe('a.com');
  });
  it('normalizes urls', () => {
    expect(normalizeUrl('localhost:3000/x')).toBe('http://localhost:3000/x');
    expect(normalizeUrl('api.x.com')).toBe('https://api.x.com');
    expect(normalizeUrl('https://a.com')).toBe('https://a.com');
  });
  it('adds auth + content-type and skips body for GET', () => {
    const r = { ...emptyRequest(), method: 'POST', url: 'a.com', bodyMode: 'json' as const, body: '{}', auth: { type: 'bearer' as const, username: '', password: '', token: 'T' } };
    const b = buildRequest(r);
    expect(b.headers).toEqual([['Authorization', 'Bearer T'], ['Content-Type', 'application/json']]);
    expect(buildRequest({ ...r, method: 'GET' }).body).toBeUndefined();
    const basic = buildRequest({ ...r, auth: { type: 'basic', username: 'u', password: 'p', token: '' } });
    expect(basic.headers[0]).toEqual(['Authorization', 'Basic dTpw']);
  });
  it('does not override explicit Authorization / disabled headers ignored', () => {
    const r = { ...emptyRequest(), url: 'a.com', headers: [kv('authorization', 'X'), kv('Off', '1', false)], auth: { type: 'bearer' as const, username: '', password: '', token: 'T' } };
    expect(buildRequest(r).headers).toEqual([['authorization', 'X']]);
  });
  it('urlencoded body', () => {
    const b = buildRequest({ ...emptyRequest(), method: 'POST', url: 'a.com', bodyMode: 'urlencoded', form: [kv('a b', 'c&d')] });
    expect(b.body).toBe('a%20b=c%26d');
  });
  it('variables', () => {
    const r = { ...emptyRequest(), url: '{{host}}/u/{{ id }}', headers: [kv('X', '{{tok}}')], body: '{"a":"{{id}}"}' };
    expect(findVars(r).sort()).toEqual(['host', 'id', 'tok']);
    const out = applyVars(r, { host: 'https://a.com', id: '7', tok: '' });
    expect(out.url).toBe('https://a.com/u/7');
    expect(out.headers[0]!.value).toBe('{{tok}}'); // empty value leaves placeholder
    expect(out.body).toBe('{"a":"7"}');
  });
});

describe('code generation', () => {
  const req = parseCurl(`curl -X POST https://a.com/x -H 'Content-Type: application/json' -d '{"a":true,"b":null}'`).request;
  it('curl round-trips', () => {
    const again = parseCurl(toCurl(req)).request;
    expect(again).toMatchObject({ method: 'POST', url: 'https://a.com/x', body: '{"a":true,"b":null}', bodyMode: 'json' });
  });
  it('curl quoting survives single quotes', () => {
    const r = { ...emptyRequest(), method: 'POST', url: 'https://a.com', bodyMode: 'text' as const, body: "it's" };
    expect(parseCurl(toCurl(r)).request.body).toBe("it's");
  });
  it('fetch / axios / python include the essentials', () => {
    expect(toFetch(req)).toContain('await fetch("https://a.com/x"');
    expect(toFetch(req)).toContain('method: "POST"');
    expect(toAxios(req)).toContain('method: "post"');
    const py = toPython(req);
    expect(py).toContain('requests.post("https://a.com/x"');
    expect(py).toContain('"a": True');
    expect(py).toContain('"b": None');
  });
});

describe('sendRequest', () => {
  const fake = (res: Response | Error) => (async () => { if (res instanceof Error) throw res; return res; }) as unknown as typeof fetch;
  it('returns status, headers, text body', async () => {
    const r = await sendRequest({ ...emptyRequest(), url: 'https://a.com' }, {
      fetchImpl: fake(new Response('{"ok":1}', { status: 201, statusText: 'Created', headers: { 'content-type': 'application/json' } })),
    });
    expect(r).toMatchObject({ ok: true, status: 201, body: '{"ok":1}', binary: false, bytes: 8 });
  });
  it('flags binary bodies', async () => {
    const r = await sendRequest({ ...emptyRequest(), url: 'https://a.com' }, {
      fetchImpl: fake(new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/png' } })),
    });
    expect(r).toMatchObject({ binary: true, body: '', bytes: 3 });
  });
  it('explains network/CORS failures and bad input', async () => {
    const e = await sendRequest({ ...emptyRequest(), url: 'https://a.com' }, { fetchImpl: fake(new TypeError('Failed to fetch')) });
    expect(e.status).toBe(0);
    expect(e.error).toMatch(/CORS/);
    expect((await sendRequest(emptyRequest())).error).toMatch(/Enter a URL/);
    expect((await sendRequest({ ...emptyRequest(), url: 'http://' })).error).toMatch(/Invalid URL/);
  });
  it('times out', async () => {
    const hang = ((_u: string, init: RequestInit) => new Promise((_, rej) => init.signal!.addEventListener('abort', () => rej(new Error('aborted'))))) as unknown as typeof fetch;
    const r = await sendRequest({ ...emptyRequest(), url: 'https://a.com' }, { fetchImpl: hang, timeoutMs: 20 });
    expect(r.error).toMatch(/timed out/);
  });
});
