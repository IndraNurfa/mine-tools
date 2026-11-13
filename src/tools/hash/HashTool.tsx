import React, { useEffect, useState } from 'react';
import { usePersistentState } from '../../lib/storage.ts';
import { HASH_ALGOS, hashText, hmacText, type HashAlgo } from '../../core/hash/hash.ts';
import { Check, CopyRow, PaneHeader, Toolbar, inputCls, textareaCls, usePaste } from '../../components/ui.tsx';

export const HashTool: React.FC = () => {
  const [input, setInput] = usePersistentState('hash', 'input', 'hello world');
  const [secret, setSecret] = useState('');
  const [upper, setUpper] = usePersistentState('hash', 'upper', false);
  const [hashes, setHashes] = useState<Record<string, string>>({});
  const paste = usePaste(setInput);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: Record<string, string> = {};
      for (const a of HASH_ALGOS) {
        out[a] =
          secret && a !== 'MD5'
            ? await hmacText(input, secret, a as Exclude<HashAlgo, 'MD5'>)
            : await hashText(input, a);
      }
      if (!cancelled) setHashes(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [input, secret]);

  return (
    <div className="h-full flex flex-col min-h-0 bg-canvas">
      <Toolbar>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-mute">HMAC key</span>
          <input
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="optional — leave empty for plain hash"
            className={`${inputCls} w-64`}
          />
        </div>
        <Check checked={upper} onChange={setUpper}>
          Uppercase
        </Check>
        {secret && <span className="text-xs text-mute">MD5 stays a plain hash (HMAC covers SHA-*).</span>}
      </Toolbar>
      <div className="h-[40%] min-h-[120px] flex flex-col border-b border-hairline">
        <PaneHeader title="Text" onPaste={paste} onClear={() => setInput('')} />
        <textarea
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          placeholder="Text to hash (UTF-8)…"
          className={textareaCls}
        />
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-4 space-y-2">
        {HASH_ALGOS.map((a) => {
          const h = hashes[a] ?? '';
          return <CopyRow key={a} label={a} value={upper ? h.toUpperCase() : h} />;
        })}
      </div>
    </div>
  );
};
