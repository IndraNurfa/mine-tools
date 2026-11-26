/** Strip tokens, passwords and cookies from requests before they are saved. */
import { generateCode, parseCurl } from './curl.ts';
import type { ApiRequest, KV } from './request.ts';

const SENSITIVE =
  /authorization|^auth$|cookie|token(?!s)|secret|passw(or)?d|^pwd$|api[-_]?key|access[-_]?key|private[-_]?key|session|credential|signature|^sig$|^key$/i;

/** Whether a header, parameter, field or variable name usually carries a secret. */
export const isSensitiveName = (name: string) => SENSITIVE.test(name.trim());

const PLACEHOLDER = /\{\{\s*[\w.-]+\s*\}\}/g;

/** A bare template such as `Bearer {{token}}` holds no secret and is kept. */
const isTemplate = (v: string) => {
  const rest = v.replace(PLACEHOLDER, '');
  return rest !== v && /^(\s|;|bearer|basic|token|[\w-]+=)*$/i.test(rest);
};

const hide = (v: string) => (isTemplate(v) ? v : '');

const redactList = (list: KV[]) => list.map((x) => (isSensitiveName(x.key) ? { ...x, value: hide(x.value) } : x));

const redactPairs = (text: string, pattern: RegExp) =>
  text.replace(pattern, (m, sep: string, name: string, value: string) =>
    isSensitiveName(name) ? `${sep}${name}=${hide(value)}` : m,
  );

const redactUrl = (url: string) =>
  redactPairs(
    // user:password@host
    url.replace(
      /^((?:[a-z][a-z0-9+.-]*:\/\/)?[^/?#@:]+:)([^/?#@]+)@/i,
      (_, head: string, password: string) => `${head}${hide(password)}@`,
    ),
    // ?api_key=… and #access_token=…
    /([?&#])([^=&#?]+)=([^&#]*)/g,
  );

/** String-based so big numbers and half-typed bodies stay exactly as typed. */
const redactBody = (body: string) =>
  redactPairs(
    // JSON string values
    body.replace(/("((?:[^"\\]|\\.)*)"\s*:\s*)"((?:[^"\\]|\\.)*)"/g, (m, head: string, name: string, value: string) =>
      isSensitiveName(name) ? `${head}"${hide(value)}"` : m,
    ),
    // form-encoded text
    /(^|&)([^=&\s{}"]+)=([^&]*)/g,
  );

export function redactRequest(req: ApiRequest): ApiRequest {
  return {
    ...req,
    url: redactUrl(req.url),
    headers: redactList(req.headers),
    form: redactList(req.form),
    body: redactBody(req.body),
    auth: { ...req.auth, password: hide(req.auth.password), token: hide(req.auth.token) },
  };
}

const SECRET_HINT =
  /authorization|bearer\s|(^|\s)(-u|-b|-U)|--(user|cookie|proxy-user|pass|oauth2-bearer)|token|secret|passw|api[-_]?key/i;
/** Flags the parser drops, so their values never show up in the parsed request. */
const DROPPED_SECRET_FLAG = /(^|\s)(-U|--proxy-user|--pass|--oauth2-bearer)(\s|=)/;

/**
 * cURL text that is safe to save: unchanged when it holds no secret, rebuilt from
 * the redacted request when it does, `undefined` (save nothing) when it holds a
 * likely secret but can't be parsed.
 */
export function redactCurl(command: string): string | undefined {
  try {
    const { request } = parseCurl(command);
    const safe = redactRequest(request);
    if (JSON.stringify(safe) === JSON.stringify(request) && !DROPPED_SECRET_FLAG.test(command)) return command;
    return generateCode(safe, 'curl');
  } catch {
    return SECRET_HINT.test(command) ? undefined : command;
  }
}
