import React, { useEffect, useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import { formatInTimeZone, formatTimestamp, parseTimestamp } from '../../core/time/timestamp.ts';
import { AutoGrid, CopyRow, Page, Panel, Stat, TextBtn, Toolbar, inputCls } from '../../components/ui.tsx';

const ZONES = ['UTC', 'Asia/Jakarta', 'Asia/Singapore', 'Asia/Tokyo', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles'];

export const TimestampTool: React.FC = () => {
  const [input, setInput] = useState(() => String(Math.floor(Date.now() / 1000)));
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const date = useMemo(() => parseTimestamp(input), [input]);
  const f = date ? formatTimestamp(date, now) : null;
  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zones = useMemo(() => [localZone, ...ZONES.filter((z) => z !== localZone)], [localZone]);

  return (
    <div className="h-full flex flex-col min-h-0 bg-canvas">
      <Toolbar>
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder="Unix seconds / ms / µs / ns, ISO 8601, or any date string"
            className={`${inputCls} flex-1 text-base py-2.5`}
          />
          <TextBtn primary onClick={() => setInput(String(Math.floor(Date.now() / 1000)))}>
            <Clock className="w-3.5 h-3.5" />
            Now
          </TextBtn>
        </div>
        <span className="font-mono text-xs text-mute tabular-nums">
          live unix: <span className="text-primary">{Math.floor(now / 1000)}</span>
        </span>
      </Toolbar>
      <Page className="content-start">
        {!input.trim() ? (
          <div className="text-sm text-mute">Enter a timestamp or date above.</div>
        ) : !f ? (
          <div className="text-sm text-red-400">Can’t parse that as a date or timestamp.</div>
        ) : (
          <div className="grid xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6">
            <div className="space-y-6">
              <AutoGrid min={200}>
                <Stat label="Unix (s)" value={f.unixSeconds} />
                <Stat label="Unix (ms)" value={f.unixMillis} />
                <Stat label="Relative" value={f.relative} tone="text-primary" />
              </AutoGrid>
              <Panel title="Formats" bodyClassName="p-4 space-y-2">
                <CopyRow label="ISO 8601" value={f.iso} />
                <CopyRow label="UTC" value={f.utc} />
                <CopyRow label="Local" value={f.local} />
              </Panel>
            </div>
            <Panel title="Time zones">
              <AutoGrid min={400} gap={8}>
                {zones.map((z) => (
                  <CopyRow
                    key={z}
                    label={z === localZone ? 'Local' : z.split('/').pop()!.replace('_', ' ')}
                    value={formatInTimeZone(date!, z)}
                  />
                ))}
              </AutoGrid>
            </Panel>
          </div>
        )}
      </Page>
    </div>
  );
};
