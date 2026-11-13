import React, { useMemo } from 'react';
import { describeCron, nextRuns, parseCron } from '../../core/cron/cron.ts';
import { formatInTimeZone, relativeTime } from '../../core/time/timestamp.ts';
import { AutoGrid, Check, Page, Panel, Toolbar, inputCls } from '../../components/ui.tsx';
import { usePersistentState } from '../../lib/storage.ts';

const PRESETS: [string, string][] = [
  ['*/5 * * * *', 'Every 5 min'],
  ['0 * * * *', 'Hourly'],
  ['0 9 * * 1-5', 'Weekdays 9am'],
  ['0 0 * * *', 'Daily midnight'],
  ['0 0 * * 0', 'Weekly'],
  ['0 0 1 * *', 'Monthly'],
  ['30 2 1 1 *', 'Yearly'],
];
const FIELDS = ['minute', 'hour', 'day', 'month', 'weekday'];

export const CronTool: React.FC = () => {
  const [expr, setExpr] = usePersistentState('cron', 'expr', '*/15 9-17 * * mon-fri');
  const [count, setCount] = usePersistentState('cron', 'count', 12);
  const [utc, setUtc] = usePersistentState('cron', 'utc', false);

  const result = useMemo(() => {
    try {
      const spec = parseCron(expr);
      return { text: describeCron(spec), runs: nextRuns(spec, new Date(), Math.max(1, Math.min(50, count)), utc) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [expr, count, utc]);

  const parts = expr.trim().split(/\s+/);
  const zone = utc ? 'UTC' : Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="h-full flex flex-col min-h-0 bg-canvas">
      <Toolbar>
        <input
          autoFocus
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          spellCheck={false}
          placeholder="*/5 * * * *   or   @daily"
          className={`${inputCls} flex-1 min-w-[260px] text-lg py-2.5 tracking-[0.2em]`}
        />
        <Check checked={utc} onChange={setUtc}>UTC</Check>
        <label className="flex items-center gap-2 text-xs text-body">
          Runs
          <input type="number" min={1} max={50} value={count} onChange={(e) => setCount(parseInt(e.target.value, 10) || 1)} className={`${inputCls} w-16`} />
        </label>
      </Toolbar>
      <Page className="grid xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6 content-start">
        <div className="space-y-6">
          <Panel title="Meaning">
            {'error' in result ? (
              <div className="text-base text-red-400">{result.error}</div>
            ) : (
              <p className="text-2xl leading-snug text-ink-strong">{result.text}</p>
            )}
            <div className="mt-5 grid grid-cols-5 gap-2 text-center">
              {FIELDS.map((f, i) => (
                <div key={f} className="rounded-md border border-hairline bg-canvas-soft py-3 min-w-0">
                  <div className="font-mono text-lg text-ink truncate px-1">{parts[i] ?? '·'}</div>
                  <div className="text-[11px] uppercase tracking-wider text-mute mt-1 truncate px-1">{f}</div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Presets">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(([p, label]) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setExpr(p)}
                  className={`px-3 py-2 rounded-md border text-xs transition-colors ${
                    expr.trim() === p ? 'border-primary/50 bg-primary/10 text-primary' : 'border-hairline bg-canvas-soft text-body hover:border-primary/40'
                  }`}
                >
                  {label} <span className="ml-1 font-mono text-mute">{p}</span>
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-mute">
              Fields: minute hour day-of-month month day-of-week. Supports <code className="font-mono text-primary-soft">*</code>,{' '}
              <code className="font-mono text-primary-soft">*/5</code>, <code className="font-mono text-primary-soft">1-5</code>,{' '}
              <code className="font-mono text-primary-soft">1,15</code>, names (<code className="font-mono text-primary-soft">mon</code>,{' '}
              <code className="font-mono text-primary-soft">jan</code>) and <code className="font-mono text-primary-soft">@daily</code>-style aliases.
            </p>
          </Panel>
        </div>

        <Panel title={`Next runs · ${zone}`}>
          {'error' in result ? (
            <div className="text-sm text-mute">Fix the expression to see upcoming runs.</div>
          ) : result.runs.length === 0 ? (
            <div className="text-sm text-mute">Never fires in the next 8 years.</div>
          ) : (
            <AutoGrid min={420} gap={8}>
              {result.runs.map((d, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-hairline bg-canvas-soft font-mono text-[13px]">
                  <span className="w-6 text-mute text-xs">{i + 1}</span>
                  <span className="text-ink truncate">{formatInTimeZone(d, zone)}</span>
                  <span className="ml-auto text-mute text-xs shrink-0">{relativeTime(d)}</span>
                </div>
              ))}
            </AutoGrid>
          )}
        </Panel>
      </Page>
    </div>
  );
};
