import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Per-tool localStorage. Every key is `toolbox:<toolId>:<key>` so each tool owns
 * its own namespace and can be cleared independently. All access is try/catch'd
 * (private mode, quota, disabled storage) and falls back to in-memory state.
 */
const PREFIX = 'toolbox:';
const k = (toolId: string, key: string) => `${PREFIX}${toolId}:${key}`;

export function loadStored<T>(toolId: string, key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k(toolId, key));
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function saveStored(toolId: string, key: string, value: unknown): void {
  try {
    localStorage.setItem(k(toolId, key), JSON.stringify(value));
  } catch {
    /* quota or disabled: state simply stays in memory */
  }
}

/** Remove saved data for one tool, or for every tool when `toolId` is omitted. */
export function clearStored(toolId?: string): void {
  try {
    const prefix = toolId ? `${PREFIX}${toolId}:` : PREFIX;
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
): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    const fallback = typeof initial === 'function' ? (initial as () => T)() : initial;
    return loadStored<T>(toolId, key, fallback);
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
