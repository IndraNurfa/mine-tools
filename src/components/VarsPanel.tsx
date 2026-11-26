import React from 'react';
import { SecretInput, inputCls } from './ui.tsx';
import { isSensitiveName } from '../core/http/redact.ts';

/** Inputs for {{placeholders}} found in a request. Values are matched by name. */
export const VarsPanel: React.FC<{
  names: string[];
  values: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}> = ({ names, values, onChange }) => {
  if (!names.length)
    return (
      <p className="text-xs text-mute leading-relaxed">
        Use <code className="font-mono text-primary-soft">{'{{name}}'}</code> in the URL, headers, auth or body, and a field to fill it in appears here.
        Values are kept by name until you close the page; tick “Remember secrets” to save them.
      </p>
    );
  return (
    <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,380px),1fr))]">
      {names.map((n) => (
        <label key={n} className="flex items-center gap-3 text-xs">
          <span className="w-32 shrink-0 font-mono text-primary-soft truncate" title={n}>{`{{${n}}}`}</span>
          {isSensitiveName(n) ? (
            <SecretInput value={values[n] ?? ''} onChange={(e) => onChange({ ...values, [n]: e.target.value })} placeholder="value" />
          ) : (
            <input
              value={values[n] ?? ''}
              onChange={(e) => onChange({ ...values, [n]: e.target.value })}
              spellCheck={false}
              placeholder="value"
              className={`${inputCls} flex-1`}
            />
          )}
        </label>
      ))}
    </div>
  );
};
