import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Repeat } from 'lucide-react';
import {
  DELIMITERS, columnStats, detectDelimiter, filterRows, sortRows, stringifyCsv, toMarkdownTable,
  toObjects, toSqlInserts, toTable, transpose, type CsvTable,
} from '../../core/csv/csv.ts';
import { Check, DropZone, FileButton, PaneHeader, Segmented, TextBtn, Toolbar, fmtSize, inputCls, textareaCls, useCopy, usePaste } from '../../components/ui.tsx';
import { usePersistentState } from '../../lib/storage.ts';

const PAGE = 500;

export const CsvViewerTool: React.FC = () => {
  const [input, setInput] = usePersistentState('csv-viewer', 'input', 'id,name,city,score\n1,Ann,Jakarta,92.5\n2,Bob,Bandung,78\n3,Cy,Jakarta,85\n4,Di,Surabaya,');
  const [delim, setDelim] = usePersistentState('csv-viewer', 'delim', 'auto');
  const [hasHeader, setHasHeader] = usePersistentState('csv-viewer', 'hasHeader', true);
  const [query, setQuery] = usePersistentState('csv-viewer', 'query', '');
  const [flip, setFlip] = usePersistentState('csv-viewer', 'transpose', false);
  const [sort, setSort] = useState<{ col: number; dir: 'asc' | 'desc' } | null>(null);
  const [statCol, setStatCol] = useState<number | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [showInput, setShowInput] = useState(true);
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const copy = useCopy();
  const paste = usePaste(setInput);
  const loadFile = (text: string, f: { name: string; size: number }) => {
    setInput(text);
    setFile(f);
    setSort(null);
    setQuery('');
    setLimit(PAGE);
    if (/\.tsv$/i.test(f.name)) setDelim('\t');
  };

  const realDelim = delim === 'auto' ? detectDelimiter(input) : delim;
  const base = useMemo<CsvTable>(() => {
    const t = toTable(input, realDelim, hasHeader);
    return flip ? transpose(t) : t;
  }, [input, realDelim, hasHeader, flip]);

  const rows = useMemo(() => {
    let r = filterRows(base.rows, query);
    if (sort && sort.col < base.header.length) r = sortRows(r, sort.col, sort.dir);
    return r;
  }, [base, query, sort]);
  const view: CsvTable = { header: base.header, rows };
  const stats = statCol !== null && statCol < base.header.length ? columnStats(rows, statCol) : null;

  const exportAs = (label: string, text: string) => copy(text, `${label} copied`);
  const clickHeader = (i: number) =>
    setSort((s) => (s?.col === i ? (s.dir === 'asc' ? { col: i, dir: 'desc' } : null) : { col: i, dir: 'asc' }));

  return (
    <DropZone onFile={loadFile} className="h-full flex flex-col min-h-0 bg-canvas" hint="Drop a CSV / TSV file">
      <Toolbar>
        <FileButton onFile={loadFile} label="Upload CSV" />
        <Segmented
          value={delim}
          options={DELIMITERS.map((d) => ({ id: d.id, label: d.id === 'auto' ? `Auto (${JSON.stringify(realDelim).slice(1, -1)})` : d.label }))}
          onChange={setDelim}
        />
        <Check checked={hasHeader} onChange={setHasHeader}>First row is header</Check>
        <TextBtn onClick={() => setFlip(!flip)}>
          <Repeat className="w-3.5 h-3.5" /> {flip ? 'Un-transpose' : 'Transpose'}
        </TextBtn>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter rows…"
          className={`${inputCls} w-44`}
        />
        <TextBtn onClick={() => setShowInput(!showInput)}>{showInput ? 'Hide input' : 'Show input'}</TextBtn>
        <span className="ml-auto font-mono text-xs text-mute">
          <span className="text-primary">{rows.length}</span>
          {rows.length !== base.rows.length && ` / ${base.rows.length}`} rows · {base.header.length} cols
        </span>
      </Toolbar>

      <div className="flex-1 min-h-0 flex flex-col">
        {showInput && (
          <div className="h-[28%] min-h-[100px] flex flex-col border-b border-hairline">
            <PaneHeader
              title={file ? `CSV · ${file.name} (${fmtSize(file.size)})` : 'CSV'}
              onPaste={paste}
              onClear={() => {
                setInput('');
                setFile(null);
              }}
            />
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setLimit(PAGE);
              }}
              spellCheck={false}
              placeholder="Paste CSV / TSV, upload a file, or drop one anywhere here…"
              className={textareaCls}
            />
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-auto">
          {base.header.length === 0 ? (
            <div className="p-6 text-sm text-mute">Nothing to show yet.</div>
          ) : (
            <table className="text-xs font-mono border-separate border-spacing-0 min-w-full">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="bg-canvas-soft border-b border-r border-hairline px-2 py-1.5 text-mute font-normal text-right">#</th>
                  {base.header.map((h, i) => (
                    <th
                      key={i}
                      onClick={() => clickHeader(i)}
                      className="bg-canvas-soft border-b border-r border-hairline px-3 py-1.5 text-left font-semibold text-ink cursor-pointer select-none hover:text-primary whitespace-nowrap"
                    >
                      <span className="inline-flex items-center gap-1">
                        {h}
                        {sort?.col === i && (sort.dir === 'asc' ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, limit).map((r, ri) => (
                  <tr key={ri} className="hover:bg-canvas-soft/60">
                    <td className="border-b border-r border-hairline/60 px-2 py-1 text-mute text-right tabular-nums">{ri + 1}</td>
                    {base.header.map((_, ci) => (
                      <td
                        key={ci}
                        className={`border-b border-r border-hairline/60 px-3 py-1 text-body whitespace-pre max-w-[360px] truncate ${r[ci] === '' ? 'text-mute/40' : ''}`}
                        title={r[ci]}
                      >
                        {r[ci] === '' ? '∅' : r[ci]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {rows.length > limit && (
            <div className="p-3">
              <TextBtn onClick={() => setLimit(limit + PAGE)}>Show {Math.min(PAGE, rows.length - limit)} more ({rows.length - limit} hidden)</TextBtn>
            </div>
          )}
        </div>

        {/* Column stats + export */}
        <div className="shrink-0 border-t border-hairline px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
          <label className="flex items-center gap-2 text-body">
            Stats for
            <select
              value={statCol ?? ''}
              onChange={(e) => setStatCol(e.target.value === '' ? null : Number(e.target.value))}
              className={inputCls}
            >
              <option value="">—</option>
              {base.header.map((h, i) => (
                <option key={i} value={i}>{h}</option>
              ))}
            </select>
          </label>
          {stats && (
            <span className="font-mono text-mute">
              {stats.unique} unique · {stats.empty} empty
              {stats.numeric && <> · min {stats.min} · max {stats.max} · sum {+stats.sum!.toFixed(4)} · avg {+stats.avg!.toFixed(4)}</>}
              {stats.top.length > 0 && !stats.numeric && <> · top: {stats.top.map(([v, n]) => `${v} (${n})`).join(', ')}</>}
            </span>
          )}
          <span className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-mute">Copy as</span>
            <TextBtn onClick={() => exportAs('CSV', stringifyCsv(view, realDelim === '\t' ? ',' : realDelim))}>CSV</TextBtn>
            <TextBtn onClick={() => exportAs('TSV', stringifyCsv(view, '\t'))}>TSV</TextBtn>
            <TextBtn onClick={() => exportAs('JSON', JSON.stringify(toObjects(view), null, 2))}>JSON</TextBtn>
            <TextBtn onClick={() => exportAs('Markdown', toMarkdownTable(view))}>Markdown</TextBtn>
            <TextBtn onClick={() => exportAs('SQL', toSqlInserts(view))}>SQL INSERT</TextBtn>
          </span>
        </div>
      </div>
    </DropZone>
  );
};
