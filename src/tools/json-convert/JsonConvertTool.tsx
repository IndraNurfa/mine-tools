import React, { useMemo, useState } from 'react';
import { usePersistentState } from '../../lib/storage.ts';
import { parseLooseJSON } from '../../core/parse/parser.ts';
import { astToValue, csvToJson, toCsv, toTypeScript, toYaml } from '../../core/convert/jsonConvert.ts';
import { PaneHeader, Segmented, Toolbar, textareaCls, usePaste } from '../../components/ui.tsx';

type Target = 'yaml' | 'csv' | 'ts' | 'from-csv';

export const JsonConvertTool: React.FC = () => {
  const [input, setInput] = usePersistentState('json-convert', 'input', `[
  { id: 1, name: 'Ann', tags: ['a', 'b'], active: true },
  { id: 2, name: 'Bob', address: { city: 'Bandung' }, active: false },
]`);
  const [target, setTarget] = usePersistentState<Target>('json-convert', 'target', 'yaml');
  const paste = usePaste(setInput);

  const { output, error } = useMemo(() => {
    if (!input.trim()) return { output: '', error: '' };
    try {
      if (target === 'from-csv') return { output: csvToJson(input, { infer: true }), error: '' };
      const v = astToValue(parseLooseJSON(input));
      return {
        output: target === 'yaml' ? toYaml(v) : target === 'csv' ? toCsv(v) : toTypeScript(v),
        error: '',
      };
    } catch (e) {
      return { output: '', error: (e as Error).message };
    }
  }, [input, target]);

  return (
    <div className="h-full flex flex-col min-h-0 bg-canvas">
      <Toolbar>
        <Segmented
          value={target}
          options={[
            { id: 'yaml', label: 'YAML' },
            { id: 'csv', label: 'CSV' },
            { id: 'ts', label: 'TypeScript' },
            { id: 'from-csv', label: 'CSV → JSON' },
          ]}
          onChange={setTarget}
        />
        <span className="text-xs text-mute">Loose JSON in (CSV in for CSV → JSON); big numbers stay exact.</span>
      </Toolbar>
      <div className="flex-1 min-h-0 grid grid-rows-2 lg:grid-rows-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-hairline">
        <div className="flex flex-col min-h-0">
          <PaneHeader title={target === 'from-csv' ? 'CSV (first row = header)' : 'JSON'} onPaste={paste} onClear={() => setInput('')} />
          <textarea
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder={target === 'from-csv' ? 'Paste CSV…' : 'Paste JSON…'}
            className={textareaCls}
          />
        </div>
        <div className="flex flex-col min-h-0">
          <PaneHeader
            title="Output"
            copyText={output}
            extra={error ? <span className="text-xs text-red-400 mr-2 truncate max-w-[60%]">{error}</span> : undefined}
          />
          <textarea readOnly value={output} spellCheck={false} className={textareaCls} />
        </div>
      </div>
    </div>
  );
};
