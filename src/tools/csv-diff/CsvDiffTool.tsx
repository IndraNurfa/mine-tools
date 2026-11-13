import React, { useMemo, useState } from 'react';
import { csvDiff, detectDelimiter, toTable, type RowDiffType } from '../../core/csv/csv.ts';
import { Check, DropZone, FileButton, PaneHeader, Segmented, Toolbar, fmtSize, inputCls, textareaCls, usePaste } from '../../components/ui.tsx';
import { usePersistentState } from '../../lib/storage.ts';

const A = 'id,name,city\n1,Ann,Jakarta\n2,Bob,Bandung\n3,Cy,Surabaya';
const B = 'id,name,city,email\n1,Ann,Jakarta,ann@x.com\n2,Bobby,Bandung,\n4,Di,Medan,';

const TONE: Record<RowDiffType, string> = {
  added: 'bg-primary/10',
  removed: 'bg-red-400/10',
  changed: 'bg-yellow-400/5',
  same: '',
};
const BADGE: Record<RowDiffType, string> = {
  added: 'text-primary',
  removed: 'text-red-400',
  changed: 'text-yellow-400',
  same: 'text-mute',
};

export const CsvDiffTool: React.FC = () => {
  const [left, setLeft] = usePersistentState('csv-diff', 'left', A);
  const [right, setRight] = usePersistentState('csv-diff', 'right', B);
  const [key, setKey] = usePersistentState<string>('csv-diff', 'key', 'id');
  const [trim, setTrim] = usePersistentState('csv-diff', 'trim', true);
  const [ignoreCase, setIgnoreCase] = usePersistentState('csv-diff', 'ignoreCase', false);
  const [show, setShow] = useState<'all' | 'diff'>('diff');
  const [fileL, setFileL] = useState<{ name: string; size: number } | null>(null);
  const [fileR, setFileR] = useState<{ name: string; size: number } | null>(null);
  const pasteL = usePaste(setLeft);
  const pasteR = usePaste(setRight);

  const a = useMemo(() => toTable(left, detectDelimiter(left), true), [left]);
  const b = useMemo(() => toTable(right, detectDelimiter(right), true), [right]);
  const commonCols = a.header.filter((h) => b.header.includes(h));
  const effectiveKey = key && commonCols.includes(key) ? key : null;

  const diff = useMemo(
    () => csvDiff(a, b, { key: effectiveKey, trim, ignoreCase }),
    [a, b, effectiveKey, trim, ignoreCase],
  );
  const rows = show === 'all' ? diff.rows : diff.rows.filter((r) => r.type !== 'same');

  return (
    <div className="h-full flex flex-col min-h-0 bg-canvas">
      <Toolbar>
        <label className="flex items-center gap-2 text-xs text-body">
          Match rows by
          <select value={effectiveKey ?? ''} onChange={(e) => setKey(e.target.value)} className={inputCls}>
            <option value="">Row position</option>
            {commonCols.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <Check checked={trim} onChange={setTrim}>Trim spaces</Check>
        <Check checked={ignoreCase} onChange={setIgnoreCase}>Ignore case</Check>
        <Segmented
          value={show}
          options={[
            { id: 'diff', label: 'Differences' },
            { id: 'all', label: 'All rows' },
          ]}
          onChange={setShow}
        />
        <span className="ml-auto font-mono text-xs flex gap-3">
          <span className={BADGE.added}>+{diff.counts.added}</span>
          <span className={BADGE.removed}>−{diff.counts.removed}</span>
          <span className={BADGE.changed}>~{diff.counts.changed}</span>
          <span className="text-mute">={diff.counts.same}</span>
        </span>
      </Toolbar>

      <div className="h-[30%] min-h-[110px] grid grid-cols-2 divide-x divide-hairline border-b border-hairline">
        <DropZone className="flex flex-col min-h-0" hint="Drop file as A" onFile={(t, f) => { setLeft(t); setFileL(f); }}>
          <PaneHeader
            title={`A · ${fileL ? `${fileL.name} (${fmtSize(fileL.size)})` : 'original'} · ${a.rows.length} rows`}
            onPaste={pasteL}
            onClear={() => { setLeft(''); setFileL(null); }}
            extra={<FileButton label="Upload A" onFile={(t, f) => { setLeft(t); setFileL(f); }} />}
          />
          <textarea value={left} onChange={(e) => setLeft(e.target.value)} spellCheck={false} placeholder="Paste CSV, upload, or drop a file…" className={textareaCls} />
        </DropZone>
        <DropZone className="flex flex-col min-h-0" hint="Drop file as B" onFile={(t, f) => { setRight(t); setFileR(f); }}>
          <PaneHeader
            title={`B · ${fileR ? `${fileR.name} (${fmtSize(fileR.size)})` : 'modified'} · ${b.rows.length} rows`}
            onPaste={pasteR}
            onClear={() => { setRight(''); setFileR(null); }}
            extra={<FileButton label="Upload B" onFile={(t, f) => { setRight(t); setFileR(f); }} />}
          />
          <textarea value={right} onChange={(e) => setRight(e.target.value)} spellCheck={false} placeholder="Paste CSV, upload, or drop a file…" className={textareaCls} />
        </DropZone>
      </div>

      {(diff.columnsAdded.length > 0 || diff.columnsRemoved.length > 0) && (
        <div className="shrink-0 px-4 py-2 text-xs border-b border-hairline flex gap-4 font-mono">
          {diff.columnsAdded.length > 0 && <span className="text-primary">+ columns: {diff.columnsAdded.join(', ')}</span>}
          {diff.columnsRemoved.length > 0 && <span className="text-red-400">− columns: {diff.columnsRemoved.join(', ')}</span>}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto">
        {rows.length === 0 ? (
          <div className="p-6 text-sm text-mute">{diff.rows.length ? 'No differences 🎉' : 'Paste two CSVs to compare.'}</div>
        ) : (
          <table className="text-xs font-mono border-separate border-spacing-0 min-w-full">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="bg-canvas-soft border-b border-r border-hairline px-2 py-1.5 w-8" />
                <th className="bg-canvas-soft border-b border-r border-hairline px-3 py-1.5 text-left text-mute font-normal">{effectiveKey ?? 'row'}</th>
                {diff.columns.filter((c) => c !== effectiveKey).map((c) => (
                  <th key={c} className="bg-canvas-soft border-b border-r border-hairline px-3 py-1.5 text-left text-ink whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 2000).map((r, i) => (
                <tr key={i} className={TONE[r.type]}>
                  <td className={`border-b border-r border-hairline/60 px-2 py-1 text-center font-bold ${BADGE[r.type]}`}>
                    {{ added: '+', removed: '−', changed: '~', same: '' }[r.type]}
                  </td>
                  <td className="border-b border-r border-hairline/60 px-3 py-1 text-ink">{r.key}</td>
                  {diff.columns.filter((c) => c !== effectiveKey).map((c) => {
                    const av = r.a?.[c];
                    const bv = r.b?.[c];
                    const isChanged = r.changed.includes(c);
                    return (
                      <td key={c} className="border-b border-r border-hairline/60 px-3 py-1 whitespace-pre max-w-[320px] truncate">
                        {isChanged ? (
                          <>
                            <span className="text-red-400 line-through">{av === '' ? '∅' : av}</span>
                            <span className="text-mute"> → </span>
                            <span className="text-primary">{bv === '' ? '∅' : bv}</span>
                          </>
                        ) : (
                          <span className={r.type === 'added' ? 'text-primary' : r.type === 'removed' ? 'text-red-400' : 'text-body'}>
                            {(r.type === 'added' ? bv : av) ?? <span className="text-mute/40">—</span>}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
