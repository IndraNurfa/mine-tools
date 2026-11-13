/** Encoders/decoders for everyday text transforms. All UTF-8 safe. */

function bytesToBinary(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return s;
}

export function base64Encode(text: string, urlSafe = false, pad = true): string {
  let out = btoa(bytesToBinary(new TextEncoder().encode(text)));
  if (urlSafe) out = out.replace(/\+/g, '-').replace(/\//g, '_');
  if (urlSafe || !pad) out = out.replace(/=+$/, '');
  return out;
}

/** Accepts standard or URL-safe alphabets, with or without padding and whitespace. */
export function base64Decode(input: string): string {
  let s = input.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4 !== 0) s += '=';
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export function urlEncode(text: string, mode: 'component' | 'full' = 'component'): string {
  return mode === 'full' ? encodeURI(text) : encodeURIComponent(text);
}

export function urlDecode(text: string): string {
  // form-encoded "+" is treated as a space only when no %20 is present
  const s = text.includes('+') && !text.includes('%20') ? text.replace(/\+/g, ' ') : text;
  return decodeURIComponent(s);
}

const HTML_ESC: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function htmlEscape(text: string): string {
  return text.replace(/[&<>"']/g, (c) => HTML_ESC[c]!);
}

const HTML_NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  copy: '©',
  reg: '®',
  hellip: '…',
  mdash: '—',
  ndash: '–',
};

export function htmlUnescape(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1]!.toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      try {
        return String.fromCodePoint(code);
      } catch {
        return m;
      }
    }
    return HTML_NAMED[e.toLowerCase()] ?? m;
  });
}

export function hexEncode(text: string): string {
  return Array.from(new TextEncoder().encode(text))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ');
}

export function hexDecode(text: string): string {
  const clean = text.replace(/0x/gi, '').replace(/[\s,:-]+/g, '');
  if (clean.length % 2 !== 0 || /[^0-9a-f]/i.test(clean)) throw new Error('Invalid hex input');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

/** JSON string-literal escaping (what you'd paste between quotes). */
export function jsonEscape(text: string): string {
  return JSON.stringify(text).slice(1, -1);
}

export function jsonUnescape(text: string): string {
  const t = text.trim();
  const body = t.startsWith('"') && t.endsWith('"') && t.length >= 2 ? t : `"${t}"`;
  return JSON.parse(body) as string;
}

/** Non-ASCII → \uXXXX */
export function unicodeEscape(text: string): string {
  return Array.from(text, (ch) => {
    const c = ch.codePointAt(0)!;
    if (c < 128) return ch;
    if (c > 0xffff) {
      const o = c - 0x10000;
      return '\\u' + (0xd800 + (o >> 10)).toString(16) + '\\u' + (0xdc00 + (o & 0x3ff)).toString(16);
    }
    return '\\u' + c.toString(16).padStart(4, '0');
  }).join('');
}

export function unicodeUnescape(text: string): string {
  return text
    .replace(/\\u\{([0-9a-f]+)\}/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\\u([0-9a-f]{4})/gi, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
}
