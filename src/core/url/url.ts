export interface ParsedUrl {
  href: string;
  protocol: string;
  username: string;
  password: string;
  hostname: string;
  port: string;
  pathname: string;
  hash: string;
  params: [string, string][];
}

export function parseUrl(input: string): ParsedUrl {
  let s = input.trim();
  if (!s) throw new Error('Empty URL');
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s) || /^[^/]+:\d+(\/|$)/.test(s)) s = 'https://' + s.replace(/^\/\//, '');
  const u = new URL(s);
  return {
    href: u.href,
    protocol: u.protocol,
    username: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    hostname: u.hostname,
    port: u.port,
    pathname: u.pathname,
    hash: u.hash,
    params: [...u.searchParams.entries()],
  };
}

/** Rebuild a URL string with a replaced query-parameter list (empty keys dropped). */
export function withParams(href: string, params: [string, string][]): string {
  const u = new URL(href);
  u.search = '';
  for (const [k, v] of params) if (k) u.searchParams.append(k, v);
  return u.href;
}
