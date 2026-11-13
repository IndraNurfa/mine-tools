import { type ApiRequest, type BodyMode, type KV, buildRequest, emptyRequest, kv } from './request.ts';

// ------------------------------------------------------------- tokenizer

/** POSIX-ish word splitting: '…', "…", $'…', backslashes and line continuations. */
export function shellSplit(input: string): string[] {
  const s = input.replace(/\\\r?\n/g, ' ');
  const out: string[] = [];
  let cur = '';
  let has = false;
  let i = 0;
  const ESC: Record<string, string> = { n: '\n', t: '\t', r: '\r', '\\': '\\', "'": "'", '"': '"', a: '\x07', b: '\b', f: '\f', v: '\v', e: '\x1b' };
  while (i < s.length) {
    const c = s[i]!;
    if (/\s/.test(c)) {
      if (has) {
        out.push(cur);
        cur = '';
        has = false;
      }
      i++;
    } else if (c === "'") {
      has = true;
      i++;
      while (i < s.length && s[i] !== "'") cur += s[i++];
      i++;
    } else if (c === '"') {
      has = true;
      i++;
      while (i < s.length && s[i] !== '"') {
        if (s[i] === '\\' && i + 1 < s.length && '"\\$`'.includes(s[i + 1]!)) {
          cur += s[i + 1];
          i += 2;
        } else cur += s[i++];
      }
      i++;
    } else if (c === '$' && s[i + 1] === "'") {
      has = true;
      i += 2;
      while (i < s.length && s[i] !== "'") {
        if (s[i] === '\\' && i + 1 < s.length) {
          const n = s[i + 1]!;
          if (n === 'u' || n === 'x') {
            const len = n === 'u' ? 4 : 2;
            const hex = s.slice(i + 2, i + 2 + len);
            if (new RegExp(`^[0-9a-fA-F]{${len}}$`).test(hex)) {
              cur += String.fromCharCode(parseInt(hex, 16));
              i += 2 + len;
              continue;
            }
          }
          cur += ESC[n] ?? n;
          i += 2;
        } else cur += s[i++];
      }
      i++;
    } else if (c === '\\' && i + 1 < s.length) {
      has = true;
      cur += s[i + 1];
      i += 2;
    } else {
      has = true;
      cur += c;
      i++;
    }
  }
  if (has) out.push(cur);
  return out;
}

// ----------------------------------------------------------------- parser

/** Flags that take a value (short, then long). */
const SHORT_ARG = new Set(['X', 'H', 'd', 'F', 'u', 'b', 'A', 'e', 'o', 'm', 'x', 'T', 'w', 'K', 'c']);
const LONG_ARG = new Set([
  'request', 'header', 'data', 'data-raw', 'data-binary', 'data-ascii', 'data-urlencode', 'form', 'form-string',
  'user', 'cookie', 'user-agent', 'referer', 'url', 'json', 'output', 'max-time', 'proxy', 'upload-file',
  'connect-timeout', 'retry', 'cacert', 'cert', 'key', 'resolve', 'write-out', 'oauth2-bearer', 'cookie-jar',
]);
const LONG_ALIAS: Record<string, string> = { request: 'X', header: 'H', data: 'd', form: 'F', user: 'u', cookie: 'b', 'user-agent': 'A', referer: 'e', head: 'I', get: 'G' };

export interface CurlParseResult {
  request: ApiRequest;
  /** Flags we understood but can't reproduce in a browser (-k, --proxy…). */
  notes: string[];
}

export function parseCurl(command: string): CurlParseResult {
  const tokens = shellSplit(command.trim());
  if (!tokens.length) throw new Error('Paste a cURL command.');
  if (tokens[0]!.toLowerCase() === 'curl') tokens.shift();
  else if (!tokens.some((t) => /^https?:\/\//i.test(t))) throw new Error('That does not look like a cURL command.');

  const req = emptyRequest();
  const notes: string[] = [];
  const dataParts: { value: string; urlencode?: boolean }[] = [];
  const form: KV[] = [];
  let method = '';
  let useGet = false;
  let head = false;
  let jsonFlag = false;
  let url = '';

  const apply = (flag: string, val: string | undefined, long?: string) => {
    switch (flag) {
      case 'X': method = (val ?? '').toUpperCase(); break;
      case 'H': {
        const i = (val ?? '').indexOf(':');
        if (i < 0) {
          if ((val ?? '').endsWith(';')) req.headers.push(kv(val!.slice(0, -1), ''));
        } else req.headers.push(kv(val!.slice(0, i).trim(), val!.slice(i + 1).trim()));
        break;
      }
      case 'd':
        if (long === 'data-urlencode') dataParts.push({ value: val ?? '', urlencode: true });
        else dataParts.push({ value: val ?? '' });
        break;
      case 'F': {
        const v = val ?? '';
        const i = v.indexOf('=');
        if (i > 0) form.push(kv(v.slice(0, i), v.slice(i + 1)));
        break;
      }
      case 'u': {
        const v = val ?? '';
        const i = v.indexOf(':');
        req.auth = { type: 'basic', username: i < 0 ? v : v.slice(0, i), password: i < 0 ? '' : v.slice(i + 1), token: '' };
        break;
      }
      case 'b': req.headers.push(kv('Cookie', val ?? '')); break;
      case 'A': req.headers.push(kv('User-Agent', val ?? '')); break;
      case 'e': req.headers.push(kv('Referer', val ?? '')); break;
      case 'I': head = true; break;
      case 'G': useGet = true; break;
      case 'k': case 'insecure': notes.push('-k/--insecure ignored (the browser always verifies TLS)'); break;
      case 'x': case 'proxy': notes.push('--proxy ignored'); break;
      case 'L': case 's': case 'S': case 'v': case 'i': case 'O': case 'f': case 'g': case 'N': case 'compressed':
      case 'location': case 'silent': case 'show-error': case 'verbose': case 'include': case 'fail': case 'globoff':
      case 'o': case 'output': case 'm': case 'max-time': case 'connect-timeout': case 'retry': case 'w': case 'write-out':
        break;
      default:
        if (flag.length > 1 || /[a-zA-Z]/.test(flag)) notes.push(`-${flag.length > 1 ? '-' : ''}${flag} ignored`);
    }
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.startsWith('--') && t.length > 2) {
      const eq = t.indexOf('=');
      const name = eq > 0 ? t.slice(2, eq) : t.slice(2);
      let val = eq > 0 ? t.slice(eq + 1) : undefined;
      if (name === 'url') {
        url = val ?? tokens[++i] ?? '';
        continue;
      }
      if (name === 'json') {
        jsonFlag = true;
        dataParts.push({ value: val ?? tokens[++i] ?? '' });
        continue;
      }
      if (name === 'data-raw' || name === 'data-binary' || name === 'data-ascii' || name === 'data-urlencode') {
        val = val ?? tokens[++i];
        apply('d', val, name);
        continue;
      }
      if (name === 'head') { apply('I', undefined); continue; }
      if (name === 'get') { apply('G', undefined); continue; }
      if (name === 'form-string') { val = val ?? tokens[++i]; apply('F', val); continue; }
      if (name === 'oauth2-bearer') {
        req.auth = { type: 'bearer', username: '', password: '', token: val ?? tokens[++i] ?? '' };
        continue;
      }
      if (LONG_ARG.has(name)) {
        val = val ?? tokens[++i];
        apply(LONG_ALIAS[name] ?? name, val, name);
      } else apply(LONG_ALIAS[name] ?? name, undefined, name);
    } else if (t.startsWith('-') && t.length > 1) {
      // short cluster, e.g. -sSL, -XPOST, -H'a: b'
      for (let j = 1; j < t.length; j++) {
        const f = t[j]!;
        if (SHORT_ARG.has(f)) {
          const rest = t.slice(j + 1);
          apply(f, rest !== '' ? rest : tokens[++i]);
          break;
        }
        apply(f, undefined);
      }
    } else if (!url) url = t;
    else notes.push(`extra argument "${t}" ignored`);
  }

  if (!url) throw new Error('No URL found in the cURL command.');
  req.url = url;

  // headers → content type
  const ct = req.headers.find((h) => h.key.toLowerCase() === 'content-type')?.value.toLowerCase() ?? '';

  // body
  if (form.length) {
    req.bodyMode = 'form-data';
    req.form = form;
    if (form.some((f) => f.value.startsWith('@'))) notes.push('file uploads (@path) can’t be read in the browser — replace them with text');
  } else if (dataParts.length) {
    const joined = dataParts
      .map((d) => {
        if (!d.urlencode) return d.value;
        const i = d.value.indexOf('=');
        return i < 0 ? encodeURIComponent(d.value) : (i === 0 ? '' : d.value.slice(0, i) + '=') + encodeURIComponent(d.value.slice(i + 1));
      })
      .join(jsonFlag ? '' : '&');
    if (useGet) {
      req.url += (req.url.includes('?') ? '&' : '?') + joined;
    } else {
      req.body = joined;
      if (jsonFlag || ct.includes('json')) {
        req.bodyMode = 'json';
        if (jsonFlag && !ct) req.headers.push(kv('Content-Type', 'application/json'));
        if (jsonFlag && !req.headers.some((h) => h.key.toLowerCase() === 'accept')) req.headers.push(kv('Accept', 'application/json'));
      } else {
        req.bodyMode = 'text';
        // curl sends form-urlencoded by default when -d is used without a Content-Type
        if (!ct) req.headers.push(kv('Content-Type', 'application/x-www-form-urlencoded'));
      }
    }
  }

  req.method = head ? 'HEAD' : method || (req.bodyMode !== 'none' && !useGet ? 'POST' : 'GET');
  return { request: req, notes };
}

// -------------------------------------------------------------- generators

const shq = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;
const jsq = (s: string) => JSON.stringify(s);
const pyq = (s: string) => JSON.stringify(s);

export type CodeTarget = 'curl' | 'fetch' | 'axios' | 'python';
export const CODE_TARGETS: { id: CodeTarget; label: string }[] = [
  { id: 'curl', label: 'cURL' },
  { id: 'fetch', label: 'fetch' },
  { id: 'axios', label: 'axios' },
  { id: 'python', label: 'Python requests' },
];

export function toCurl(req: ApiRequest): string {
  const b = buildRequest(req);
  const lines = [`curl ${b.method !== 'GET' || b.body !== undefined ? `-X ${b.method} ` : ''}${shq(b.url)}`];
  for (const [k, v] of b.headers) lines.push(`-H ${shq(`${k}: ${v}`)}`);
  if (b.body instanceof FormData) {
    for (const f of req.form.filter((x) => x.enabled && x.key)) lines.push(`-F ${shq(`${f.key}=${f.value}`)}`);
  } else if (b.body !== undefined) lines.push(`--data-raw ${shq(b.body)}`);
  return lines.join(' \\\n  ');
}

export function toFetch(req: ApiRequest): string {
  const b = buildRequest(req);
  const parts: string[] = [];
  let pre = '';
  if (b.method !== 'GET') parts.push(`  method: ${jsq(b.method)},`);
  if (b.headers.length) {
    parts.push(`  headers: {\n${b.headers.map(([k, v]) => `    ${jsq(k)}: ${jsq(v)},`).join('\n')}\n  },`);
  }
  if (b.body instanceof FormData) {
    pre = 'const form = new FormData();\n' + req.form.filter((x) => x.enabled && x.key).map((f) => `form.append(${jsq(f.key)}, ${jsq(f.value)});`).join('\n') + '\n\n';
    parts.push('  body: form,');
  } else if (b.body !== undefined) {
    const isJson = req.bodyMode === 'json' && (() => { try { JSON.parse(b.body as string); return true; } catch { return false; } })();
    parts.push(isJson ? `  body: JSON.stringify(${JSON.stringify(JSON.parse(b.body as string), null, 2).split('\n').join('\n  ')}),` : `  body: ${jsq(b.body)},`);
  }
  const opts = parts.length ? `, {\n${parts.join('\n')}\n}` : '';
  return `${pre}const res = await fetch(${jsq(b.url)}${opts});\nconst data = await res.text();\nconsole.log(res.status, data);`;
}

export function toAxios(req: ApiRequest): string {
  const b = buildRequest(req);
  const cfg: string[] = [`  method: ${jsq(b.method.toLowerCase())},`, `  url: ${jsq(b.url)},`];
  if (b.headers.length) cfg.push(`  headers: {\n${b.headers.map(([k, v]) => `    ${jsq(k)}: ${jsq(v)},`).join('\n')}\n  },`);
  let pre = '';
  if (b.body instanceof FormData) {
    pre = 'const form = new FormData();\n' + req.form.filter((x) => x.enabled && x.key).map((f) => `form.append(${jsq(f.key)}, ${jsq(f.value)});`).join('\n') + '\n\n';
    cfg.push('  data: form,');
  } else if (b.body !== undefined) {
    let data = jsq(b.body);
    if (req.bodyMode === 'json') {
      try { data = JSON.stringify(JSON.parse(b.body), null, 2).split('\n').join('\n  '); } catch { /* keep string */ }
    }
    cfg.push(`  data: ${data},`);
  }
  return `import axios from 'axios';\n\n${pre}const res = await axios({\n${cfg.join('\n')}\n});\nconsole.log(res.status, res.data);`;
}

function pyLiteral(v: unknown, depth: number): string {
  const pad = '    '.repeat(depth + 1);
  const end = '    '.repeat(depth);
  if (v === null) return 'None';
  if (v === true) return 'True';
  if (v === false) return 'False';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return pyq(v);
  if (Array.isArray(v)) {
    return v.length ? `[\n${v.map((x) => pad + pyLiteral(x, depth + 1)).join(',\n')},\n${end}]` : '[]';
  }
  const entries = Object.entries(v as Record<string, unknown>);
  return entries.length ? `{\n${entries.map(([k, x]) => `${pad}${pyq(k)}: ${pyLiteral(x, depth + 1)}`).join(',\n')},\n${end}}` : '{}';
}

export function toPython(req: ApiRequest): string {
  const b = buildRequest(req);
  const lines = ['import requests', ''];
  const args = [pyq(b.url)];
  if (b.headers.length) {
    lines.push(`headers = {\n${b.headers.map(([k, v]) => `    ${pyq(k)}: ${pyq(v)},`).join('\n')}\n}`);
    args.push('headers=headers');
  }
  if (b.body instanceof FormData) {
    lines.push(`files = {\n${req.form.filter((x) => x.enabled && x.key).map((f) => `    ${pyq(f.key)}: (None, ${pyq(f.value)}),`).join('\n')}\n}`);
    args.push('files=files');
  } else if (b.body !== undefined) {
    let done = false;
    if (req.bodyMode === 'json') {
      try {
        lines.push(`payload = ${pyLiteral(JSON.parse(b.body), 0)}`);
        args.push('json=payload');
        done = true;
      } catch { /* invalid JSON: send as raw string */ }
    }
    if (!done) {
      lines.push(`payload = ${pyq(b.body)}`);
      args.push('data=payload');
    }
  }
  lines.push('', `res = requests.${b.method.toLowerCase()}(${args.join(', ')})`, 'print(res.status_code, res.text)');
  return lines.join('\n');
}

export function generateCode(req: ApiRequest, target: CodeTarget): string {
  switch (target) {
    case 'curl': return toCurl(req);
    case 'fetch': return toFetch(req);
    case 'axios': return toAxios(req);
    case 'python': return toPython(req);
  }
}

export type { BodyMode };
