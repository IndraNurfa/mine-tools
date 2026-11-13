import React, { useCallback, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  entropyBits,
  generatePassword,
  randomBytesBase64Url,
  randomBytesHex,
  randomInt,
  shuffle,
} from '../../core/random/random.ts';
import { AutoGrid, Check, Page, Segmented, TextBtn, Toolbar, inputCls, useCopy } from '../../components/ui.tsx';
import { usePersistentState } from '../../lib/storage.ts';

type Kind = 'password' | 'token' | 'number' | 'pick';

export const RandomTool: React.FC = () => {
  const [kind, setKind] = usePersistentState<Kind>('random', 'kind', 'password');
  const [length, setLength] = usePersistentState('random', 'length', 20);
  const [lower, setLower] = usePersistentState('random', 'lower', true);
  const [upper, setUpper] = usePersistentState('random', 'upper', true);
  const [digits, setDigits] = usePersistentState('random', 'digits', true);
  const [symbols, setSymbols] = usePersistentState('random', 'symbols', true);
  const [noAmbiguous, setNoAmbiguous] = usePersistentState('random', 'noAmbiguous', false);
  const [count, setCount] = usePersistentState('random', 'count', 5);
  const [min, setMin] = usePersistentState('random', 'min', 1);
  const [max, setMax] = usePersistentState('random', 'max', 100);
  const [bytes, setBytes] = usePersistentState('random', 'bytes', 32);
  const [items, setItems] = usePersistentState('random', 'items', 'alice\nbob\ncarol\ndave');
  const [nonce, setNonce] = useState(0);
  const copy = useCopy();
  const regen = useCallback(() => setNonce((n) => n + 1), []);

  const opts = { length, lower, upper, digits, symbols, noAmbiguous };
  const n = Math.max(1, Math.min(100, count));

  const out = useMemo<string[]>(() => {
    void nonce;
    switch (kind) {
      case 'password':
        return Array.from({ length: n }, () => generatePassword(opts));
      case 'token':
        return [
          `hex      ${randomBytesHex(bytes)}`,
          `base64url ${randomBytesBase64Url(bytes)}`,
        ];
      case 'number':
        return Array.from({ length: n }, () => String(randomInt(min, max)));
      case 'pick': {
        const list = items.split('\n').map((s) => s.trim()).filter(Boolean);
        return list.length ? [list[randomInt(0, list.length - 1)]!, '— shuffled —', ...shuffle(list)] : [];
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, length, lower, upper, digits, symbols, noAmbiguous, n, min, max, bytes, items, nonce]);

  const num = (v: number, set: (n: number) => void, w = 'w-20') => (
    <input
      type="number"
      value={v}
      onChange={(e) => set(parseInt(e.target.value, 10) || 0)}
      className={`${inputCls} ${w} tabular-nums`}
    />
  );

  return (
    <div className="h-full flex flex-col min-h-0 bg-canvas">
      <Toolbar>
        <Segmented
          value={kind}
          options={[
            { id: 'password', label: 'Password' },
            { id: 'token', label: 'Token' },
            { id: 'number', label: 'Number' },
            { id: 'pick', label: 'Pick / shuffle' },
          ]}
          onChange={setKind}
        />
        {kind === 'password' && (
          <>
            <label className="flex items-center gap-2 text-xs text-body">Length {num(length, setLength)}</label>
            <Check checked={lower} onChange={setLower}>a-z</Check>
            <Check checked={upper} onChange={setUpper}>A-Z</Check>
            <Check checked={digits} onChange={setDigits}>0-9</Check>
            <Check checked={symbols} onChange={setSymbols}>!@#</Check>
            <Check checked={noAmbiguous} onChange={setNoAmbiguous}>No look-alikes</Check>
          </>
        )}
        {(kind === 'password' || kind === 'number') && (
          <label className="flex items-center gap-2 text-xs text-body">Count {num(count, setCount, 'w-16')}</label>
        )}
        {kind === 'token' && <label className="flex items-center gap-2 text-xs text-body">Bytes {num(bytes, setBytes)}</label>}
        {kind === 'number' && (
          <>
            <label className="flex items-center gap-2 text-xs text-body">Min {num(min, setMin)}</label>
            <label className="flex items-center gap-2 text-xs text-body">Max {num(max, setMax)}</label>
          </>
        )}
        <TextBtn primary onClick={regen}>
          <RefreshCw className="w-3.5 h-3.5" /> Regenerate
        </TextBtn>
        {kind === 'password' && (
          <span className="text-xs text-mute font-mono">~{entropyBits(opts)} bits entropy</span>
        )}
      </Toolbar>
      <Page className="space-y-4">
        {kind === 'pick' && (
          <textarea
            value={items}
            onChange={(e) => setItems(e.target.value)}
            rows={5}
            placeholder="One option per line"
            className={`${inputCls} w-full text-sm p-3 resize-y`}
          />
        )}
        <AutoGrid min={kind === 'password' || kind === 'token' ? 420 : 200} gap={10}>
          {out.map((s, i) =>
            s === '— shuffled —' ? (
              <div key={i} className="col-span-full text-[11px] font-semibold uppercase tracking-[1.5px] text-mute pt-2">Shuffled order</div>
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => copy(s.replace(/^(hex|base64url)\s+/, ''), 'Copied')}
                className="text-left px-4 py-3.5 rounded-md border border-hairline bg-canvas-soft hover:border-primary/40 font-mono text-[15px] text-ink break-all transition-colors"
              >
                {kind === 'pick' && i === 0 ? <span className="text-primary">★ </span> : null}
                {s}
              </button>
            ),
          )}
        </AutoGrid>
        <p className="text-xs text-mute">Click any value to copy. Generated with crypto.getRandomValues (no modulo bias).</p>
      </Page>
    </div>
  );
};
