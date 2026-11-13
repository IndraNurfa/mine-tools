import React from 'react';
import { Plus, X } from 'lucide-react';
import type { KV } from '../core/http/request.ts';
import { TextBtn, inputCls } from './ui.tsx';

export const KvEditor: React.FC<{
  items: KV[];
  onChange: (items: KV[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  suggestions?: string[];
  empty?: string;
}> = ({ items, onChange, keyPlaceholder = 'key', valuePlaceholder = 'value', suggestions, empty }) => {
  const patch = (i: number, p: Partial<KV>) => onChange(items.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const listId = React.useId();
  return (
    <div className="space-y-2">
      {suggestions && (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
      {items.length === 0 && empty && <p className="text-sm text-mute pb-1">{empty}</p>}
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={it.enabled}
            onChange={(e) => patch(i, { enabled: e.target.checked })}
            className="accent-primary"
            title="Enabled"
          />
          <input
            value={it.key}
            list={suggestions ? listId : undefined}
            onChange={(e) => patch(i, { key: e.target.value })}
            placeholder={keyPlaceholder}
            spellCheck={false}
            className={`${inputCls} w-2/5 ${it.enabled ? '' : 'opacity-50'}`}
          />
          <input
            value={it.value}
            onChange={(e) => patch(i, { value: e.target.value })}
            placeholder={valuePlaceholder}
            spellCheck={false}
            className={`${inputCls} flex-1 ${it.enabled ? '' : 'opacity-50'}`}
          />
          <button
            type="button"
            title="Remove"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="p-1.5 text-mute hover:text-red-400"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <TextBtn onClick={() => onChange([...items, { key: '', value: '', enabled: true }])}>
        <Plus className="w-3.5 h-3.5" /> Add
      </TextBtn>
    </div>
  );
};
