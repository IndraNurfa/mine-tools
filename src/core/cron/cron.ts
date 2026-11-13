/** 5-field cron (minute hour day-of-month month day-of-week) parsing, describing and scheduling. */

export interface CronField {
  values: Set<number>;
  any: boolean; // field was `*` (or `*/1`)
  raw: string;
}
export interface CronSpec {
  minute: CronField;
  hour: CronField;
  dom: CronField;
  month: CronField;
  dow: CronField;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const ALIASES: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

function parseField(raw: string, min: number, max: number, names?: string[], nameBase = 0): CronField {
  const values = new Set<number>();
  const toNum = (tok: string): number => {
    if (names) {
      const i = names.indexOf(tok.toUpperCase());
      if (i >= 0) return i + nameBase;
    }
    if (!/^\d+$/.test(tok)) throw new Error(`Invalid value "${tok}"`);
    return parseInt(tok, 10);
  };
  for (const part of raw.split(',')) {
    if (!part) throw new Error('Empty list item');
    const [range, stepStr] = part.split('/');
    const step = stepStr === undefined ? 1 : parseInt(stepStr, 10);
    if (stepStr !== undefined && (!/^\d+$/.test(stepStr) || step < 1)) throw new Error(`Invalid step "${stepStr}"`);
    let lo: number, hi: number;
    if (range === '*') {
      lo = min;
      hi = max;
    } else if (range!.includes('-')) {
      const [a, b] = range!.split('-');
      lo = toNum(a!);
      hi = toNum(b!);
    } else {
      lo = toNum(range!);
      hi = stepStr === undefined ? lo : max;
    }
    if (lo < min || hi > max || lo > hi) throw new Error(`Value out of range ${min}-${max}: "${part}"`);
    for (let v = lo; v <= hi; v += step) values.add(v);
  }
  return { values, any: raw === '*' || raw === '*/1', raw };
}

export function parseCron(expr: string): CronSpec {
  const trimmed = expr.trim();
  const e = ALIASES[trimmed.toLowerCase()] ?? trimmed;
  const f = e.split(/\s+/);
  if (f.length !== 5) throw new Error('Expected 5 fields: minute hour day-of-month month day-of-week');
  const dow = parseField(f[4]!, 0, 7, DAYS, 0);
  if (dow.values.has(7)) {
    dow.values.delete(7);
    dow.values.add(0);
  }
  return {
    minute: parseField(f[0]!, 0, 59),
    hour: parseField(f[1]!, 0, 23),
    dom: parseField(f[2]!, 1, 31),
    month: parseField(f[3]!, 1, 12, MONTHS, 1),
    dow,
  };
}

function matchesDay(spec: CronSpec, d: Date, utc: boolean): boolean {
  const month = (utc ? d.getUTCMonth() : d.getMonth()) + 1;
  if (!spec.month.values.has(month)) return false;
  const dom = utc ? d.getUTCDate() : d.getDate();
  const dow = utc ? d.getUTCDay() : d.getDay();
  const domOk = spec.dom.values.has(dom);
  const dowOk = spec.dow.values.has(dow);
  if (spec.dom.any && spec.dow.any) return true;
  if (spec.dom.any) return dowOk;
  if (spec.dow.any) return domOk;
  return domOk || dowOk; // both restricted: standard cron ORs them
}

/** Next `count` run times strictly after `from`. */
export function nextRuns(spec: CronSpec, from: Date, count: number, utc = false): Date[] {
  const out: Date[] = [];
  const hours = [...spec.hour.values].sort((a, b) => a - b);
  const mins = [...spec.minute.values].sort((a, b) => a - b);
  const day = new Date(from.getTime());
  if (utc) day.setUTCHours(0, 0, 0, 0);
  else day.setHours(0, 0, 0, 0);
  for (let i = 0; i < 366 * 8 && out.length < count; i++) {
    if (matchesDay(spec, day, utc)) {
      for (const h of hours) {
        for (const m of mins) {
          const t = new Date(day.getTime());
          if (utc) t.setUTCHours(h, m, 0, 0);
          else t.setHours(h, m, 0, 0);
          if (t.getTime() > from.getTime() && out.length < count) out.push(t);
        }
      }
    }
    if (utc) day.setUTCDate(day.getUTCDate() + 1);
    else day.setDate(day.getDate() + 1);
  }
  return out;
}

const pad = (n: number) => String(n).padStart(2, '0');
const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]!);
};
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]);

function stepOf(raw: string): number | null {
  const m = /^(\*|\d+-\d+)\/(\d+)$/.exec(raw);
  return m ? parseInt(m[2]!, 10) : null;
}

export function describeCron(spec: CronSpec): string {
  const parts: string[] = [];
  const { minute, hour, dom, month, dow } = spec;
  const mins = [...minute.values].sort((a, b) => a - b);
  const hrs = [...hour.values].sort((a, b) => a - b);

  // time of day
  if (minute.any && hour.any) parts.push('Every minute');
  else if (stepOf(minute.raw) && hour.any) parts.push(`Every ${stepOf(minute.raw)} minutes`);
  else if (mins.length === 1 && hour.any) parts.push(mins[0] === 0 ? 'At the start of every hour' : `At minute ${mins[0]} past every hour`);
  else if (stepOf(hour.raw) && mins.length === 1) parts.push(`At minute ${mins[0]}, every ${stepOf(hour.raw)} hours`);
  else if (minute.any && !hour.any) parts.push(`Every minute during hour ${list(hrs.map((h) => pad(h) + ':00'))}`);
  else {
    const times: string[] = [];
    if (hrs.length * mins.length <= 6) for (const h of hrs) for (const m of mins) times.push(`${pad(h)}:${pad(m)}`);
    parts.push(
      times.length
        ? `At ${list(times)}`
        : `At minute ${list(mins.map(String))} past hour ${list(hrs.map(String))}`,
    );
  }

  if (!dom.any) parts.push(`on day ${list([...dom.values].sort((a, b) => a - b).map(ordinal))} of the month`);
  if (!dow.any) {
    const days = [...dow.values].sort((a, b) => a - b);
    const weekdays = days.length === 5 && days.join() === '1,2,3,4,5';
    parts.push(
      `${dom.any ? 'on' : 'and on'} ${weekdays ? 'Monday through Friday' : list(days.map((d) => DAY_NAMES[d]!))}`,
    );
  }
  if (!month.any) parts.push(`in ${list([...month.values].sort((a, b) => a - b).map((m) => MONTH_NAMES[m - 1]!))}`);
  return parts.join(', ');
}
