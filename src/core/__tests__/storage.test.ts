import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadStored, saveStored, clearStored, storedBytes } from '../../lib/storage.ts';

function fakeStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
    ...Object.fromEntries([]),
    _m: m,
  };
}

describe('per-tool storage', () => {
  beforeEach(() => {
    const s = fakeStorage();
    // Object.keys(localStorage) must list the stored keys
    const proxy = new Proxy(s, { ownKeys: () => [...s._m.keys()], getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }) });
    vi.stubGlobal('localStorage', proxy);
  });

  it('namespaces keys by tool and round-trips JSON', () => {
    saveStored('regex', 'pattern', 'a+b');
    saveStored('regex', 'flags', { g: true });
    expect(loadStored('regex', 'pattern', '')).toBe('a+b');
    expect(loadStored('regex', 'flags', null)).toEqual({ g: true });
    expect(loadStored('case', 'pattern', 'fallback')).toBe('fallback');
  });

  it('clears one tool without touching others', () => {
    saveStored('a', 'x', 1);
    saveStored('b', 'x', 2);
    clearStored('a');
    expect(loadStored('a', 'x', 0)).toBe(0);
    expect(loadStored('b', 'x', 0)).toBe(2);
    expect(storedBytes('b')).toBeGreaterThan(0);
    clearStored();
    expect(loadStored('b', 'x', 0)).toBe(0);
  });

  it('survives corrupt JSON and throwing storage', () => {
    localStorage.setItem('toolbox:t:k', '{not json');
    expect(loadStored('t', 'k', 'ok')).toBe('ok');
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('quota'); },
    });
    expect(loadStored('t', 'k', 'ok')).toBe('ok');
    expect(() => saveStored('t', 'k', 1)).not.toThrow();
  });
});
