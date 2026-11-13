import { describe, it, expect } from 'vitest';
import { decodeJwt, expiryState } from '../jwt/jwt.ts';

// header {"alg":"HS256","typ":"JWT"} payload {"sub":"123","exp":2000000000}
const TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJleHAiOjIwMDAwMDAwMDB9.sig';

describe('jwt', () => {
  it('decodes header and payload', () => {
    const d = decodeJwt(TOKEN);
    expect(d.alg).toBe('HS256');
    expect(d.payload.sub).toBe('123');
    expect(d.signature).toBe('sig');
  });
  it('strips Bearer prefix', () => {
    expect(decodeJwt('Bearer ' + TOKEN).payload.sub).toBe('123');
  });
  it('rejects garbage', () => {
    expect(() => decodeJwt('nope')).toThrow();
    expect(() => decodeJwt('a.b.c')).toThrow();
  });
  it('expiry states', () => {
    expect(expiryState({ exp: 100 }, 200_000)).toBe('expired');
    expect(expiryState({ exp: 300 }, 200_000)).toBe('valid');
    expect(expiryState({ nbf: 300 }, 200_000)).toBe('not-yet-valid');
    expect(expiryState({}, 0)).toBe('no-expiry');
  });
});
