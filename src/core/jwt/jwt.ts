import { base64Decode } from '../encode/encode.ts';

export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  alg: string | undefined;
}

export function decodeJwt(token: string): DecodedJwt {
  const parts = token.trim().replace(/^Bearer\s+/i, '').split('.');
  if (parts.length < 2 || parts.length > 3) {
    throw new Error('A JWT has 2 or 3 dot-separated parts');
  }
  const parse = (s: string, label: string) => {
    try {
      const v = JSON.parse(base64Decode(s));
      if (v === null || typeof v !== 'object') throw new Error();
      return v as Record<string, unknown>;
    } catch {
      throw new Error(`Could not decode ${label} as base64url JSON`);
    }
  };
  const header = parse(parts[0]!, 'header');
  const payload = parse(parts[1]!, 'payload');
  return {
    header,
    payload,
    signature: parts[2] ?? '',
    alg: typeof header.alg === 'string' ? header.alg : undefined,
  };
}

export type ExpiryState = 'valid' | 'expired' | 'not-yet-valid' | 'no-expiry';

export function expiryState(payload: Record<string, unknown>, nowMs = Date.now()): ExpiryState {
  const exp = payload.exp;
  const nbf = payload.nbf;
  if (typeof nbf === 'number' && nbf * 1000 > nowMs) return 'not-yet-valid';
  if (typeof exp !== 'number') return 'no-expiry';
  return exp * 1000 <= nowMs ? 'expired' : 'valid';
}
