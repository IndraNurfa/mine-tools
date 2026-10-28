import { describe, it, expect } from 'vitest';
import { uuidV4, uuidV7, generateUuids } from '../uuid/generate.ts';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('uuid', () => {
  it('generates v4 with version nibble 4', () => {
    const id = uuidV4();
    expect(id).toMatch(UUID_RE);
    expect(id[14]).toBe('4');
  });

  it('generates v7 with version nibble 7', () => {
    const id = uuidV7();
    expect(id).toMatch(UUID_RE);
    expect(id[14]).toBe('7');
  });

  it('bulk formats uppercase and no-hyphen', () => {
    const ids = generateUuids('v4', 3, { uppercase: true, noHyphen: true });
    expect(ids).toHaveLength(3);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9A-F]{32}$/);
    }
  });

  it('clamps count to 1..10000', () => {
    expect(generateUuids('v4', 0, { uppercase: false, noHyphen: false })).toHaveLength(1);
    expect(generateUuids('v4', 99999, { uppercase: false, noHyphen: false })).toHaveLength(10000);
  });
});
