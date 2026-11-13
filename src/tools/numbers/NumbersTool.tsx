import React, { useMemo } from 'react';
import { BYTE_UNITS_IEC, BYTE_UNITS_SI, convertBase, fromBytes, prettyNumber, toBytes } from '../../core/numbers/numbers.ts';
import { AutoGrid, CopyRow, Page, Panel, Segmented, inputCls } from '../../components/ui.tsx';
import { usePersistentState } from '../../lib/storage.ts';

const BASES = [
  { id: '10', label: 'Decimal', radix: 10 },
  { id: '16', label: 'Hex', radix: 16 },
  { id: '2', label: 'Binary', radix: 2 },
  { id: '8', label: 'Octal', radix: 8 },
  { id: '36', label: 'Base 36', radix: 36 },
];

export const NumbersTool: React.FC = () => {
  const [value, setValue] = usePersistentState('numbers', 'value', '255');
  const [from, setFrom] = usePersistentState('numbers', 'from', '10');
  const [size, setSize] = usePersistentState('numbers', 'size', '1.5');
  const [unit, setUnit] = usePersistentState('numbers', 'unit', 'GB');

  const rows = useMemo(() => {
    try {
      return BASES.map((b) => ({ ...b, out: convertBase(value, +from, b.radix), err: '' }));
    } catch (e) {
      return BASES.map((b) => ({ ...b, out: '', err: (e as Error).message }));
    }
  }, [value, from]);
  const err = rows[0]?.err;

  const bytes = useMemo(() => {
    const n = parseFloat(size);
    return Number.isFinite(n) ? toBytes(n, unit) : NaN;
  }, [size, unit]);

  return (
    <div className="h-full flex flex-col min-h-0 bg-canvas">
      <Page className="grid xl:grid-cols-2 gap-6 content-start">
        <Panel title="Number bases · BigInt-exact" bodyClassName="p-4 space-y-4">
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            spellCheck={false}
            className={`${inputCls} w-full text-lg py-3`}
            placeholder="e.g. 255, 0xff, -1010"
          />
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-mute">Input is</span>
            <Segmented value={from} options={BASES.map((b) => ({ id: b.id, label: b.label }))} onChange={setFrom} />
          </div>
          {err ? (
            <div className="text-sm text-red-400">{err}</div>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <CopyRow key={r.id} label={r.label} value={r.out} />
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Data sizes" bodyClassName="p-4 space-y-4">
          <div className="flex gap-2">
            <input value={size} onChange={(e) => setSize(e.target.value)} className={`${inputCls} flex-1 text-lg py-3`} />
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className={`${inputCls} px-3 text-sm`}>
              {[...BYTE_UNITS_SI, ...BYTE_UNITS_IEC.slice(1)].map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </div>
          {Number.isNaN(bytes) ? (
            <div className="text-sm text-red-400">Not a number.</div>
          ) : (
            <>
              <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-mute">Decimal (1000)</div>
              <AutoGrid min={190} gap={8}>
                {BYTE_UNITS_SI.map((u) => (
                  <CopyRow key={u} label={u} value={prettyNumber(fromBytes(bytes, u))} />
                ))}
              </AutoGrid>
              <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-mute pt-2">Binary (1024)</div>
              <AutoGrid min={190} gap={8}>
                {BYTE_UNITS_IEC.slice(1).map((u) => (
                  <CopyRow key={u} label={u} value={prettyNumber(fromBytes(bytes, u))} />
                ))}
              </AutoGrid>
            </>
          )}
        </Panel>
      </Page>
    </div>
  );
};
