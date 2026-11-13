import { describe, it, expect } from 'vitest';
import { hashText, hmacText, md5 } from '../hash/hash.ts';

describe('hash', () => {
  it('md5 known vectors', () => {
    expect(md5(new Uint8Array())).toBe('d41d8cd98f00b204e9800998ecf8427e');
    expect(md5(new TextEncoder().encode('abc'))).toBe('900150983cd24fb0d6963f7d28e17f72');
    expect(
      md5(new TextEncoder().encode('The quick brown fox jumps over the lazy dog')),
    ).toBe('9e107d9d372bb6826bd81d3542a419d6');
  });
  it('md5 handles multi-block input', () => {
    expect(md5(new TextEncoder().encode('a'.repeat(1000)))).toBe('cabe45dcc9ae5b66ba86600cca6b8ba8');
  });
  it('sha256 / sha1', async () => {
    expect(await hashText('abc', 'SHA-256')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(await hashText('abc', 'SHA-1')).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
  });
  it('hmac sha256', async () => {
    expect(await hmacText('The quick brown fox jumps over the lazy dog', 'key', 'SHA-256')).toBe(
      'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8',
    );
  });
});
