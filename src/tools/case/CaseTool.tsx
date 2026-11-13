import React from 'react';
import { Copy } from 'lucide-react';
import { CASE_STYLES, convertCaseLines } from '../../core/text/caseConvert.ts';
import { AutoGrid, Page, PaneHeader, textareaCls, useCopy, usePaste } from '../../components/ui.tsx';
import { usePersistentState } from '../../lib/storage.ts';

export const CaseTool: React.FC = () => {
  const [input, setInput] = usePersistentState('case', 'input', 'parseHTTPResponse for user_id');
  const paste = usePaste(setInput);
  const copy = useCopy();
  const multi = input.includes('\n');

  return (
    <div className="h-full flex flex-col min-h-0 bg-canvas">
      <div className="h-[22%] min-h-[110px] max-h-[220px] flex flex-col border-b border-hairline">
        <PaneHeader title="Text · one identifier per line works too" onPaste={paste} onClear={() => setInput('')} />
        <textarea
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          placeholder="Type or paste a phrase or identifier…"
          className={textareaCls}
        />
      </div>
      <Page>
        <AutoGrid min={multi ? 380 : 340} gap={12}>
          {CASE_STYLES.map((s) => {
            const out = convertCaseLines(input, s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => copy(out, `${s.label} copied`)}
                className="group text-left rounded-md border border-hairline bg-canvas-soft px-4 py-3 hover:border-primary/40 transition-colors min-w-0"
              >
                <div className="flex items-center justify-between gap-2">
                  {/* Show the style name in its own casing (camelCase, snake_case…) */}
                  <span className="text-xs font-medium text-primary-soft">{s.label}</span>
                  <Copy className="w-3.5 h-3.5 text-mute opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="mt-2 font-mono text-[15px] leading-snug text-ink-strong whitespace-pre-wrap break-all">
                  {out || <span className="text-mute">—</span>}
                </div>
              </button>
            );
          })}
        </AutoGrid>
      </Page>
    </div>
  );
};
