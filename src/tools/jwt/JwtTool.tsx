import React, { useMemo, useState } from 'react';
import { usePersistentState } from '../../lib/storage.ts';
import { decodeJwt, expiryState } from '../../core/jwt/jwt.ts';
import { formatTimestamp } from '../../core/time/timestamp.ts';
import { PaneHeader, textareaCls, usePaste } from '../../components/ui.tsx';

const SAMPLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjIwMDAwMDAwMDB9.signature';

const BADGE = {
  valid: ['Not expired', 'text-primary border-primary/40 bg-primary/10'],
  expired: ['Expired', 'text-red-400 border-red-400/40 bg-red-400/10'],
  'not-yet-valid': ['Not valid yet', 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10'],
  'no-expiry': ['No exp claim', 'text-mute border-hairline bg-canvas-soft'],
} as const;

const TIME_CLAIMS = ['exp', 'iat', 'nbf', 'auth_time'];

export const JwtTool: React.FC = () => {
  const [input, setInput] = usePersistentState('jwt', 'input', SAMPLE);
  const paste = usePaste(setInput);

  const result = useMemo(() => {
    if (!input.trim()) return null;
    try {
      return { jwt: decodeJwt(input) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [input]);

  const jwt = result && 'jwt' in result ? result.jwt : null;
  const state = jwt ? expiryState(jwt.payload) : null;

  const pretty = (o: unknown) => JSON.stringify(o, null, 2);

  return (
    <div className="h-full flex flex-col min-h-0 bg-canvas">
      <div className="h-[34%] min-h-[140px] flex flex-col border-b border-hairline">
        <PaneHeader
          title="Token"
          onPaste={paste}
          onClear={() => setInput('')}
          extra={
            result && 'error' in result ? (
              <span className="text-xs text-red-400 mr-2">{result.error}</span>
            ) : undefined
          }
        />
        <textarea
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          placeholder="Paste a JWT (a leading “Bearer ” is fine)…"
          className={textareaCls}
        />
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-4 space-y-4">
        {jwt && state && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`px-2 py-1 rounded-pill border ${BADGE[state][1]}`}>{BADGE[state][0]}</span>
              <span className="px-2 py-1 rounded-pill border border-hairline text-body font-mono">
                alg: {jwt.alg ?? '?'}
              </span>
              <span className="text-mute">Signature is not verified.</span>
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              {(
                [
                  ['Header', jwt.header],
                  ['Payload', jwt.payload],
                ] as const
              ).map(([title, obj]) => (
                <div key={title} className="rounded-md border border-hairline bg-canvas-soft min-h-0">
                  <PaneHeader title={title} copyText={pretty(obj)} />
                  <pre className="p-3 text-sm font-mono text-ink overflow-auto whitespace-pre-wrap break-all">
                    {pretty(obj)}
                  </pre>
                </div>
              ))}
            </div>
            {TIME_CLAIMS.some((c) => typeof jwt.payload[c] === 'number') && (
              <div className="rounded-md border border-hairline bg-canvas-soft p-3 text-sm space-y-1">
                {TIME_CLAIMS.filter((c) => typeof jwt.payload[c] === 'number').map((c) => {
                  const f = formatTimestamp(new Date((jwt.payload[c] as number) * 1000));
                  return (
                    <div key={c} className="flex gap-3 font-mono">
                      <span className="w-20 text-mute">{c}</span>
                      <span className="text-ink">{f.iso}</span>
                      <span className="text-mute">({f.relative})</span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
