import React, { useMemo } from 'react';
import { addToDate, dayOfYear, diffDates, isLeapYear, isoWeek, parseDateInput, ymd } from '../../core/time/dateCalc.ts';
import { AutoGrid, Page, Panel, Stat, TextBtn, inputCls } from '../../components/ui.tsx';
import { usePersistentState } from '../../lib/storage.ts';

const today = () => ymd(new Date());
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dateCls = `${inputCls} w-full py-2.5 text-sm`;

export const DateCalcTool: React.FC = () => {
  const [a, setA] = usePersistentState('date-calc', 'a', today);
  const [b, setB] = usePersistentState('date-calc', 'b', () => ymd(addToDate(new Date(), { days: 100 })));
  const [base, setBase] = usePersistentState('date-calc', 'base', today);
  const [years, setYears] = usePersistentState('date-calc', 'years', 0);
  const [months, setMonths] = usePersistentState('date-calc', 'months', 0);
  const [weeks, setWeeks] = usePersistentState('date-calc', 'weeks', 0);
  const [days, setDays] = usePersistentState('date-calc', 'days', 30);

  const da = parseDateInput(a);
  const db = parseDateInput(b);
  const diff = useMemo(() => (da && db ? diffDates(da, db) : null), [da, db]);
  const dBase = parseDateInput(base);
  const result = dBase ? addToDate(dBase, { years, months, weeks, days }) : null;

  const num = (v: number, set: (n: number) => void, label: string) => (
    <label className="flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[1.5px] text-mute">
      {label}
      <input type="number" value={v} onChange={(e) => set(parseInt(e.target.value, 10) || 0)} className={`${dateCls} tabular-nums`} />
    </label>
  );

  return (
    <div className="h-full flex flex-col min-h-0 bg-canvas">
      <Page className="grid xl:grid-cols-2 gap-6 content-start">
        <Panel title="Difference between two dates" extra={<TextBtn onClick={() => { setA(today()); }}>Start = today</TextBtn>}>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[1.5px] text-mute">
              From
              <input type="date" value={a} onChange={(e) => setA(e.target.value)} className={dateCls} />
            </label>
            <label className="flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[1.5px] text-mute">
              To
              <input type="date" value={b} onChange={(e) => setB(e.target.value)} className={dateCls} />
            </label>
          </div>
          <div className="mt-5">
            {diff ? (
              <>
                <div className="mb-4 rounded-md border border-primary/30 bg-primary/5 px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-mute">Span</div>
                  <div className="mt-1 font-mono text-3xl text-ink-strong">
                    {diff.years}y {diff.months}m {diff.days}d
                  </div>
                  {diff.negative && <div className="mt-1 text-xs text-yellow-400">“To” is earlier than “From”.</div>}
                </div>
                <AutoGrid min={150}>
                  <Stat label="Days" value={diff.totalDays.toLocaleString()} copy={String(diff.totalDays)} />
                  <Stat label="Weeks" value={diff.totalWeeks.toLocaleString()} copy={String(diff.totalWeeks)} />
                  <Stat label="Hours" value={diff.totalHours.toLocaleString()} copy={String(diff.totalHours)} />
                  <Stat label="Minutes" value={diff.totalMinutes.toLocaleString()} copy={String(diff.totalMinutes)} />
                  <Stat label="Seconds" value={diff.totalSeconds.toLocaleString()} copy={String(diff.totalSeconds)} />
                </AutoGrid>
              </>
            ) : (
              <div className="text-sm text-red-400">Pick two valid dates.</div>
            )}
          </div>
        </Panel>

        <Panel title="Add or subtract" extra={<TextBtn onClick={() => setBase(today())}>Start = today</TextBtn>}>
          <label className="flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[1.5px] text-mute">
            Start date
            <input type="date" value={base} onChange={(e) => setBase(e.target.value)} className={dateCls} />
          </label>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {num(years, setYears, 'Years')}
            {num(months, setMonths, 'Months')}
            {num(weeks, setWeeks, 'Weeks')}
            {num(days, setDays, 'Days')}
          </div>
          <p className="mt-2 text-xs text-mute">Negative numbers subtract. Month overflow clamps (Jan 31 + 1 month = Feb 28/29).</p>
          {result && (
            <div className="mt-5">
              <div className="mb-4 rounded-md border border-primary/30 bg-primary/5 px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-mute">Result</div>
                <div className="mt-1 font-mono text-3xl text-ink-strong">{ymd(result)}</div>
                <div className="mt-1 text-sm text-body">{DOW[result.getDay()]}</div>
              </div>
              <AutoGrid min={150}>
                <Stat label="Day of year" value={String(dayOfYear(result))} />
                <Stat label="ISO week" value={String(isoWeek(result))} />
                <Stat label="Leap year" value={isLeapYear(result.getFullYear()) ? 'Yes' : 'No'} />
              </AutoGrid>
            </div>
          )}
        </Panel>
      </Page>
    </div>
  );
};
