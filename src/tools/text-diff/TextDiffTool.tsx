import React from 'react';
import { DiffEditor } from '../../components/DiffEditor.tsx';
import { Toolbar, inputCls } from '../../components/ui.tsx';
import { usePersistentState } from '../../lib/storage.ts';

const LANGS = ['plaintext', 'markdown', 'json', 'yaml', 'javascript', 'typescript', 'python', 'go', 'sql', 'html', 'css', 'shell', 'xml'];

export const TextDiffTool: React.FC = () => {
  const [left, setLeft] = usePersistentState('text-diff', 'left', '');
  const [right, setRight] = usePersistentState('text-diff', 'right', '');
  const [lang, setLang] = usePersistentState('text-diff', 'lang', 'plaintext');

  return (
    <div className="h-full flex flex-col min-h-0 bg-canvas">
      <Toolbar>
        <label className="flex items-center gap-2 text-xs text-body">
          Syntax
          <select value={lang} onChange={(e) => setLang(e.target.value)} className={inputCls}>
            {LANGS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <span className="text-xs text-mute">Any text, any language — original on the left, modified on the right.</span>
      </Toolbar>
      <div className="flex-1 min-h-0">
        <DiffEditor
          original={left}
          modified={right}
          onOriginalChange={setLeft}
          onModifiedChange={setRight}
          language={lang}
        />
      </div>
    </div>
  );
};
