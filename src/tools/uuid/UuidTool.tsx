import React, { useCallback, useState } from 'react';
import { Copy, RefreshCw, Fingerprint } from 'lucide-react';
import { UuidVersion, generateUuids } from '../../core/uuid/generate.ts';
import { Check, Label, PaneHeader, Segmented, TextBtn, inputCls, useCopy } from '../../components/ui.tsx';
import { usePersistentState } from '../../lib/storage.ts';

export const UuidTool: React.FC = () => {
  const copy = useCopy();
  const [version, setVersion] = usePersistentState<UuidVersion>('uuid', 'version', 'v4');
  const [uppercase, setUppercase] = usePersistentState('uuid', 'uppercase', false);
  const [noHyphen, setNoHyphen] = usePersistentState('uuid', 'noHyphen', false);
  const [count, setCount] = usePersistentState('uuid', 'count', 10);

  const gen = useCallback(
    (n: number) => generateUuids(version, n, { uppercase, noHyphen }),
    [version, uppercase, noHyphen],
  );
  const [single, setSingle] = useState(() => gen(1)[0]!);
  const [bulk, setBulk] = useState<string[]>(() => gen(Math.max(1, Math.min(10_000, count))));

  // Single UUID: regenerate on every option change; copy on click.
  const regenSingle = useCallback(() => setSingle(gen(1)[0]!), [gen]);
  React.useEffect(regenSingle, [regenSingle]);

  // Keep the bulk list in sync with version/format options so it is never an empty box.
  React.useEffect(() => {
    setBulk(gen(Math.max(1, Math.min(10_000, count))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gen]);

  const bulkText = bulk.join('\n');
  const generateBulk = () => setBulk(gen(Math.max(1, Math.min(10_000, count))));

  return (
    <div className="h-full flex flex-col min-h-0 bg-canvas overflow-auto">
      {/* Options shared by both sections */}
      <div className="shrink-0 border-b border-hairline px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-2">
          <Label>Version</Label>
          <Segmented
            mono
            value={version}
            options={[
              { id: 'v4', label: 'v4' },
              { id: 'v7', label: 'v7' },
            ]}
            onChange={setVersion}
          />
          <span className="text-[11px] text-mute hidden sm:inline">
            {version === 'v4' ? 'random' : 'time-ordered'}
          </span>
        </div>
        <Check checked={uppercase} onChange={setUppercase}>Uppercase</Check>
        <Check checked={noHyphen} onChange={setNoHyphen}>No hyphens</Check>
      </div>

      {/* One UUID, ready to copy */}
      <section className="px-4 py-8 border-b border-hairline flex flex-col items-center gap-4">
        <Label>Your UUID {version}</Label>
        <button
          type="button"
          onClick={() => copy(single, 'UUID copied')}
          title="Click to copy"
          className="max-w-full px-5 py-4 rounded-md border border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors font-mono text-xl sm:text-3xl text-ink-strong tracking-tight break-all"
        >
          {single}
        </button>
        <div className="flex gap-2">
          <TextBtn primary onClick={() => copy(single, 'UUID copied')}>
            <Copy className="w-3.5 h-3.5" /> Copy
          </TextBtn>
          <TextBtn onClick={regenSingle}>
            <RefreshCw className="w-3.5 h-3.5" /> New UUID
          </TextBtn>
        </div>
      </section>

      {/* Bulk */}
      <section className="flex-1 min-h-[240px] flex flex-col">
        <div className="px-4 py-3 flex flex-wrap items-center gap-3 border-b border-hairline">
          <Label>Bulk generate</Label>
          <input
            type="number"
            min={1}
            max={10000}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(10_000, parseInt(e.target.value, 10) || 1)))}
            className={`${inputCls} w-24 tabular-nums`}
          />
          <TextBtn primary onClick={generateBulk}>
            <Fingerprint className="w-3.5 h-3.5" /> Generate {count} UUIDs
          </TextBtn>
        </div>
        <PaneHeader
          title={`Output · ${bulk.length} UUID${bulk.length === 1 ? '' : 's'}`}
          copyText={bulkText}
          onClear={() => setBulk([])}
        />
        <pre className="flex-1 overflow-auto p-4 text-sm font-mono text-ink leading-relaxed whitespace-pre">
          {bulkText || <span className="text-mute">Press Generate.</span>}
        </pre>
      </section>
    </div>
  );
};
