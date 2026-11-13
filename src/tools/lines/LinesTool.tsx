import React, { useMemo, useState } from 'react';
import { usePersistentState } from '../../lib/storage.ts';
import { processLines, type SortMode } from '../../core/text/lineTools.ts';
import { Check, PaneHeader, Segmented, Toolbar, textareaCls, usePaste } from '../../components/ui.tsx';

const SORTS: { id: SortMode; label: string }[] = [
  { id: 'none', label: 'Keep order' },
  { id: 'asc', label: 'A→Z' },
  { id: 'desc', label: 'Z→A' },
  { id: 'natural', label: 'Natural' },
  { id: 'length', label: 'Length' },
  { id: 'reverse', label: 'Reverse' },
];

export const LinesTool: React.FC = () => {
  const [input, setInput] = usePersistentState('lines', 'input', 'banana\n apple\n\ncherry\nbanana\nApple');
  const [sort, setSort] = usePersistentState<SortMode>('lines', 'sort', 'none');
  const [dedupe, setDedupe] = usePersistentState('lines', 'dedupe', true);
  const [trim, setTrim] = usePersistentState('lines', 'trim', true);
  const [removeEmpty, setRemoveEmpty] = usePersistentState('lines', 'removeEmpty', true);
  const [caseInsensitive, setCaseInsensitive] = usePersistentState('lines', 'caseInsensitive', false);
  const paste = usePaste(setInput);

  const lines = useMemo(
    () => processLines(input, { sort, dedupe, trim, removeEmpty, caseInsensitive }),
    [input, sort, dedupe, trim, removeEmpty, caseInsensitive],
  );
  const output = input ? lines.join('\n') : '';
  const inCount = input ? input.split(/\r?\n/).length : 0;

  return (
    <div className="h-full flex flex-col min-h-0 bg-canvas">
      <Toolbar>
        <Segmented value={sort} options={SORTS} onChange={setSort} />
        <Check checked={dedupe} onChange={setDedupe}>Dedupe</Check>
        <Check checked={trim} onChange={setTrim}>Trim</Check>
        <Check checked={removeEmpty} onChange={setRemoveEmpty}>Drop empty</Check>
        <Check checked={caseInsensitive} onChange={setCaseInsensitive}>Ignore case</Check>
      </Toolbar>
      <div className="flex-1 min-h-0 grid grid-rows-2 lg:grid-rows-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-hairline">
        <div className="flex flex-col min-h-0">
          <PaneHeader title={`Input · ${inCount} lines`} onPaste={paste} onClear={() => setInput('')} />
          <textarea
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder="One item per line…"
            className={textareaCls}
          />
        </div>
        <div className="flex flex-col min-h-0">
          <PaneHeader title={`Output · ${input ? lines.length : 0} lines`} copyText={output} />
          <textarea readOnly value={output} spellCheck={false} className={textareaCls} />
        </div>
      </div>
    </div>
  );
};
