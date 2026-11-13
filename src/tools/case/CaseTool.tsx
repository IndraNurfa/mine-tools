import React, { useState } from 'react';
import { usePersistentState } from '../../lib/storage.ts';
import { CASE_STYLES, convertCaseLines } from '../../core/text/caseConvert.ts';
import { AutoGrid, CopyRow, PaneHeader, Page, textareaCls, usePaste } from '../../components/ui.tsx';

export const CaseTool: React.FC = () => {
  const [input, setInput] = usePersistentState('case', 'input', 'parseHTTPResponse for user_id');
  const paste = usePaste(setInput);
  const multi = input.includes('\n');

  return (
    <div className="h-full flex flex-col min-h-0 bg-canvas">
      <div className="h-[32%] min-h-[120px] flex flex-col border-b border-hairline">
        <PaneHeader title="Text (one identifier per line works too)" onPaste={paste} onClear={() => setInput('')} />
        <textarea
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          className={textareaCls}
        />
      </div>
      <Page>
        <AutoGrid min={multi ? 380 : 420} gap={10}>
        {CASE_STYLES.map((s) => {
          const out = convertCaseLines(input, s.id);
          return multi ? (
            <div key={s.id} className="rounded-md border border-hairline bg-canvas-soft">
              <PaneHeader title={s.label} copyText={out} />
              <pre className="p-3 font-mono text-sm text-ink whitespace-pre-wrap break-all">{out}</pre>
            </div>
          ) : (
            <CopyRow key={s.id} label={s.label} value={out} />
          );
        })}
        </AutoGrid>
      </Page>
    </div>
  );
};
