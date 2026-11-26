import { useCallback, useEffect, useRef, useState } from 'react';
import { REDACTORS } from './secrets.ts';
import { matchesShape } from './shape.ts';

/**
 * Per-tool localStorage. Every key is `toolbox:<toolId>:<key>` so each tool owns
 * its own namespace and can be cleared independently. All access is try/catch'd
 * (private mode, quota, disabled storage) and falls back to in-memory state.
 */
const PREFIX = 'toolbox:';
const k = (toolId: string, key: string) => `${PREFIX}${toolId}:${key}`;

/** Full values of keys that hold secrets, kept for this page session only. */
const session = new Map<string, unknown>();

const REMEMBER_KEY = k('settings', 'rememberSecrets');

export function getRememberSecrets(): boolean {
  try {
    return localStorage.getItem(REMEMBER_KEY) === 'true';
  } catch {
    return false;
  }
}

/** `undefined` removes the key. */
function write(fullKey: string, value: unknown): void {
  try {
    if (value === undefined) localStorage.removeItem(fullKey);
    else localStorage.setItem(fullKey, JSON.stringify(value));
  } catch {
    /* quota or disabled: state simply stays in memory */
  }
}

/** Strip secrets from everything already on disk (no-op when the user opted in). */
export function scrubStoredSecrets(): void {
  if (getRememberSecrets()) return;
  for (const [name, redact] of Object.entries(REDACTORS)) {
    const fullKey = PREFIX + name;
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(fullKey);
      if (raw !== null) write(fullKey, redact(JSON.parse(raw)));
    } catch {
      // Unreadable data can't be checked for secrets, so drop it.
      if (raw !== null) write(fullKey, undefined);
    }
  }
}

export function setRememberSecrets(on: boolean): void {
  write(REMEMBER_KEY, on);
  if (!on) return scrubStoredSecrets();
  for (const [fullKey, value] of session) write(fullKey, value);
}

/**
 * The saved value, or `fallback` when there is none or it fails the shape check
 * (or `isValid`), so stale data can't crash a tool.
 */
export function loadStored<T>(toolId: string, key: string, fallback: T, isValid?: (v: T) => boolean): T {
  try {
    const fullKey = k(toolId, key);
    let value: unknown;
    if (session.has(fullKey)) value = session.get(fullKey);
    else {
      const raw = localStorage.getItem(fullKey);
      if (raw === null) return fallback;
      value = JSON.parse(raw);
    }
    if (!matchesShape(value, fallback) || (isValid && !isValid(value as T))) return fallback;
    return value as T;
  } catch {
    return fallback;
  }
}

/** Keys listed in `REDACTORS` reach disk without secrets unless the user opted in. */
export function saveStored(toolId: string, key: string, value: unknown): void {
  const fullKey = k(toolId, key);
  const redact = REDACTORS[`${toolId}:${key}`];
  if (!redact) return write(fullKey, value);
  session.set(fullKey, value);
  try {
    write(fullKey, getRememberSecrets() ? value : redact(value));
  } catch {
    write(fullKey, undefined);
  }
}

/** Remove saved data for one tool, or for every tool when `toolId` is omitted. */
export function clearStored(toolId?: string): void {
  try {
    const prefix = toolId ? `${PREFIX}${toolId}:` : PREFIX;
    for (const key of [...session.keys()]) {
      if (key.startsWith(prefix)) session.delete(key);
    }
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(prefix)) localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

/** Approximate bytes saved for one tool (UTF-16 → ×2 is what browsers count). */
export function storedBytes(toolId?: string): number {
  try {
    const prefix = toolId ? `${PREFIX}${toolId}:` : PREFIX;
    let n = 0;
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(prefix)) n += (key.length + (localStorage.getItem(key)?.length ?? 0)) * 2;
    }
    return n;
  } catch {
    return 0;
  }
}

const WRITE_DELAY_MS = 300;

/**
 * Like useState, but persisted under `toolbox:<toolId>:<key>`. Writes are
 * debounced and flushed on unmount so navigating between tools never loses input.
 */
export function usePersistentState<T>(
  toolId: string,
  key: string,
  initial: T | (() => T),
  isValid?: (v: T) => boolean,
): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    const fallback = typeof initial === 'function' ? (initial as () => T)() : initial;
    return loadStored<T>(toolId, key, fallback, isValid);
  });
  const latest = useRef(value);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    if (dirty.current) {
      dirty.current = false;
      saveStored(toolId, key, latest.current);
    }
  }, [toolId, key]);

  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
        latest.current = next;
        dirty.current = true;
        clearTimeout(timer.current);
        timer.current = setTimeout(flush, WRITE_DELAY_MS);
        return next;
      });
    },
    [flush],
  );

  useEffect(() => {
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [flush]);

  return [value, set];
}
