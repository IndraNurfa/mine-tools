import React, { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { generateLorem, type LoremUnit } from '../../core/lorem/lorem.ts';
import { Check, PaneHeader, Page, Segmented, TextBtn, Toolbar, inputCls } from '../../components/ui.tsx';
import { usePersistentState } from '../../lib/storage.ts';

export const LoremTool: React.FC = () => {
  const [unit, setUnit] = usePersistentState<LoremUnit>('lorem', 'unit', 'paragraphs');
  const [count, setCount] = usePersistentState('lorem', 'count', 3);
  const [classic, setClassic] = usePersistentState('lorem', 'classic', true);
  const [seed, setSeed] = useState(() => Date.now());
  const text = useMemo(() => generateLorem(unit, count, classic, seed), [unit, count, classic, seed]);

  return (
    <div className="h-full flex flex-col min-h-0 bg-canvas">
      <Toolbar>
        <Segmented
          value={unit}
          options={[
            { id: 'paragraphs', label: 'Paragraphs' },
            { id: 'sentences', label: 'Sentences' },
            { id: 'words', label: 'Words' },
          ]}
          onChange={setUnit}
        />
        <input
          type="number"
          min={1}
          max={1000}
          value={count}
          onChange={(e) => setCount(parseInt(e.target.value, 10) || 1)}
          className={`${inputCls} w-20 tabular-nums`}
        />
        <Check checked={classic} onChange={setClassic}>Start with “Lorem ipsum”</Check>
        <TextBtn onClick={() => setSeed(Date.now())}>
          <RefreshCw className="w-3.5 h-3.5" /> Regenerate
        </TextBtn>
      </Toolbar>
      <PaneHeader title={`Output · ${text.split(/\s+/).length} words`} copyText={text} />
      <Page>
        <div className="text-[15px] leading-8 text-body xl:columns-2 gap-12">
          {text.split('\n\n').map((p, i) => (
            <p key={i} className="mb-5 break-inside-avoid-column">
              {p}
            </p>
          ))}
        </div>
      </Page>
    </div>
  );
};
