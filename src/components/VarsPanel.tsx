import React from 'react';
import { inputCls } from './ui.tsx';

/** Inputs for {{placeholders}} found in a request. Values are remembered by name. */
export const VarsPanel: React.FC<{
  names: string[];
  values: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}> = ({ names, values, onChange }) => {
  if (!names.length)
    return (
      <p className="text-xs text-mute leading-relaxed">
        Use <code className="font-mono text-primary-soft">{'{{name}}'}</code> in the URL, headers, auth or body, and a field to fill it in appears here.
        Values are remembered by name.
      </p>
    );
  return (
    <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,380px),1fr))]">
      {names.map((n) => (
        <label key={n} className="flex items-center gap-3 text-xs">
          <span className="w-32 shrink-0 font-mono text-primary-soft truncate" title={n}>{`{{${n}}}`}</span>
          <input
            value={values[n] ?? ''}
            onChange={(e) => onChange({ ...values, [n]: e.target.value })}
            spellCheck={false}
            placeholder="value"
            className={`${inputCls} flex-1`}
          />
        </label>
      ))}
    </div>
  );
};
