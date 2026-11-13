export function parseDateInput(s: string): Date | null {
  const t = s.trim();
  if (!t) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  const d = m ? new Date(+m[1]!, +m[2]! - 1, +m[3]!) : new Date(t);
  return isNaN(d.getTime()) ? null : d;
}

export interface DateDiff {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  totalWeeks: number;
  totalHours: number;
  totalMinutes: number;
  totalSeconds: number;
  negative: boolean;
}

export function diffDates(a: Date, b: Date): DateDiff {
  const negative = b.getTime() < a.getTime();
  const [from, to] = negative ? [b, a] : [a, b];
  // Largest whole number of months that still fits, then the remaining days.
  let total = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  while (total > 0 && addToDate(from, { months: total }).getTime() > to.getTime()) total--;
  const anchor = addToDate(from, { months: total });
  const years = Math.floor(total / 12);
  const months = total % 12;
  const days = Math.floor((to.getTime() - anchor.getTime()) / 86_400_000);
  const ms = to.getTime() - from.getTime();
  return {
    years,
    months,
    days,
    totalDays: Math.floor(ms / 86_400_000),
    totalWeeks: Math.floor(ms / 604_800_000),
    totalHours: Math.floor(ms / 3_600_000),
    totalMinutes: Math.floor(ms / 60_000),
    totalSeconds: Math.floor(ms / 1000),
    negative,
  };
}

export interface DateDelta {
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;
}

/** Add calendar units; month overflow clamps (Jan 31 + 1 month = Feb 28/29). */
export function addToDate(d: Date, delta: DateDelta): Date {
  const r = new Date(d.getTime());
  const totalMonths = (delta.years ?? 0) * 12 + (delta.months ?? 0);
  if (totalMonths) {
    const day = r.getDate();
    r.setDate(1);
    r.setMonth(r.getMonth() + totalMonths);
    const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
    r.setDate(Math.min(day, last));
  }
  r.setDate(r.getDate() + (delta.weeks ?? 0) * 7 + (delta.days ?? 0));
  return r;
}

export function dayOfYear(d: Date): number {
  return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86_400_000) + 1;
}

export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y0.getTime()) / 86_400_000 + 1) / 7);
}

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
