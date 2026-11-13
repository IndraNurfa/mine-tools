/** Timestamp parsing/formatting helpers. */

/** Parse unix seconds/ms/µs/ns (by magnitude) or any Date-parsable string. */
export function parseTimestamp(input: string): Date | null {
  const s = input.trim();
  if (!s) return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    const abs = Math.abs(n);
    let ms: number;
    if (abs < 1e11) ms = n * 1000;
    else if (abs < 1e14) ms = n;
    else if (abs < 1e17) ms = n / 1000;
    else ms = n / 1e6;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function relativeTime(date: Date, now = Date.now()): string {
  const diff = date.getTime() - now;
  const abs = Math.abs(diff);
  const units: [number, string][] = [
    [31_536_000_000, 'year'],
    [2_592_000_000, 'month'],
    [86_400_000, 'day'],
    [3_600_000, 'hour'],
    [60_000, 'minute'],
    [1000, 'second'],
  ];
  for (const [size, name] of units) {
    if (abs >= size) {
      const n = Math.floor(abs / size);
      const label = `${n} ${name}${n === 1 ? '' : 's'}`;
      return diff < 0 ? `${label} ago` : `in ${label}`;
    }
  }
  return 'just now';
}

export interface TimestampFormats {
  unixSeconds: string;
  unixMillis: string;
  iso: string;
  utc: string;
  local: string;
  relative: string;
}

export function formatTimestamp(date: Date, now = Date.now()): TimestampFormats {
  return {
    unixSeconds: String(Math.floor(date.getTime() / 1000)),
    unixMillis: String(date.getTime()),
    iso: date.toISOString(),
    utc: date.toUTCString(),
    local: date.toString(),
    relative: relativeTime(date, now),
  };
}

export function formatInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  }).format(date);
}
