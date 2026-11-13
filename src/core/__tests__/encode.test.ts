import { describe, it, expect } from 'vitest';
import {
  base64Encode,
  base64Decode,
  urlEncode,
  urlDecode,
  htmlEscape,
  htmlUnescape,
  hexEncode,
  hexDecode,
} from '../encode/encode.ts';

describe('encode', () => {
  it('base64 round-trips unicode', () => {
    const t = 'héllo 世界 🚀';
    expect(base64Decode(base64Encode(t))).toBe(t);
  });
  it('base64 url-safe has no +/= chars and decodes without padding', () => {
    const enc = base64Encode('???>>>', true);
    expect(enc).not.toMatch(/[+/=]/);
    expect(base64Decode(enc)).toBe('???>>>');
  });
  it('base64 known value', () => {
    expect(base64Encode('hello')).toBe('aGVsbG8=');
    expect(base64Encode('hello', false, false)).toBe('aGVsbG8');
  });
  it('url encode/decode', () => {
    expect(urlEncode('a b&c=d/é')).toBe('a%20b%26c%3Dd%2F%C3%A9');
    expect(urlEncode('http://x.com/a b', 'full')).toBe('http://x.com/a%20b');
    expect(urlDecode('a%20b%26c')).toBe('a b&c');
    expect(urlDecode('a+b')).toBe('a b');
  });
  it('html escape/unescape', () => {
    expect(htmlEscape('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
    expect(htmlUnescape('&lt;b&gt; &#65; &#x42; &amp;amp; &unknown;')).toBe('<b> A B &amp; &unknown;');
  });
  it('hex round-trips', () => {
    expect(hexEncode('Hi é')).toBe('48 69 20 c3 a9');
    expect(hexDecode('48 69 20 c3 a9')).toBe('Hi é');
    expect(() => hexDecode('xyz')).toThrow();
  });
});
