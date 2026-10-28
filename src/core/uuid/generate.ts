/** UUID helpers using the Web Crypto API (browser equivalent of Node crypto). */

export type UuidVersion = 'v4' | 'v7';

export interface UuidFormatOptions {
  uppercase: boolean;
  noHyphen: boolean;
}

function bytesToUuid(bytes: Uint8Array): string {
  const hex: string[] = [];
  for (let i = 0; i < 16; i++) {
    hex.push(bytes[i]!.toString(16).padStart(2, '0'));
  }
  return (
    hex[0]! +
    hex[1]! +
    hex[2]! +
    hex[3]! +
    '-' +
    hex[4]! +
    hex[5]! +
    '-' +
    hex[6]! +
    hex[7]! +
    '-' +
    hex[8]! +
    hex[9]! +
    '-' +
    hex[10]! +
    hex[11]! +
    hex[12]! +
    hex[13]! +
    hex[14]! +
    hex[15]!
  );
}

/** RFC 4122 UUID version 4 via crypto.getRandomValues / randomUUID when available. */
export function uuidV4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  return bytesToUuid(bytes);
}

/**
 * RFC 9562 UUID version 7: 48-bit Unix epoch ms + random.
 * Layout: timestamp (48) | ver (4) | rand_a (12) | var (2) | rand_b (62)
 */
export function uuidV7(now = Date.now()): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // 48-bit big-endian timestamp in milliseconds
  const ts = BigInt(now);
  bytes[0] = Number((ts >> 40n) & 0xffn);
  bytes[1] = Number((ts >> 32n) & 0xffn);
  bytes[2] = Number((ts >> 24n) & 0xffn);
  bytes[3] = Number((ts >> 16n) & 0xffn);
  bytes[4] = Number((ts >> 8n) & 0xffn);
  bytes[5] = Number(ts & 0xffn);

  // version 7
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  // variant 10xx
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  return bytesToUuid(bytes);
}

export function generateUuids(
  version: UuidVersion,
  count: number,
  opts: UuidFormatOptions,
): string[] {
  const n = Math.max(1, Math.min(10_000, Math.floor(count) || 1));
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    let id = version === 'v7' ? uuidV7() : uuidV4();
    if (opts.noHyphen) id = id.replace(/-/g, '');
    if (opts.uppercase) id = id.toUpperCase();
    out.push(id);
  }
  return out;
}
