import React, { useCallback, useState } from 'react';
import { useToast } from '../../components/Toast.tsx';
import { UuidVersion, generateUuids } from '../../core/uuid/generate.ts';
import { Copy, RefreshCw, Fingerprint } from 'lucide-react';

export const UuidTool: React.FC = () => {
  const { showToast } = useToast();
  const [version, setVersion] = useState<UuidVersion>('v4');
  const [count, setCount] = useState(10);
  const [uppercase, setUppercase] = useState(false);
  const [noHyphen, setNoHyphen] = useState(false);
  const [ids, setIds] = useState<string[]>(() =>
    generateUuids('v4', 10, { uppercase: false, noHyphen: false }),
  );

  const regenerate = useCallback(
    (overrides?: {
      version?: UuidVersion;
      count?: number;
      uppercase?: boolean;
      noHyphen?: boolean;
    }) => {
      const v = overrides?.version ?? version;
      const n = overrides?.count ?? count;
      const up = overrides?.uppercase ?? uppercase;
      const nh = overrides?.noHyphen ?? noHyphen;
      setIds(generateUuids(v, n, { uppercase: up, noHyphen: nh }));
    },
    [version, count, uppercase, noHyphen],
  );

  const onVersion = (v: UuidVersion) => {
    setVersion(v);
    regenerate({ version: v });
  };

  const onCountChange = (raw: string) => {
    const n = Math.max(1, Math.min(10_000, parseInt(raw, 10) || 1));
    setCount(n);
    regenerate({ count: n });
  };

  const onUppercase = (v: boolean) => {
    setUppercase(v);
    regenerate({ uppercase: v });
  };

  const onNoHyphen = (v: boolean) => {
    setNoHyphen(v);
    regenerate({ noHyphen: v });
  };

  const output = ids.join('\n');

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(output);
      showToast(ids.length === 1 ? 'UUID copied' : `${ids.length} UUIDs copied`);
    } catch {
      showToast('Clipboard access denied', { type: 'error' });
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0 bg-canvas">
      {/* Controls */}
      <div className="shrink-0 border-b border-hairline px-4 py-3 space-y-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-mute uppercase tracking-wider text-[10px] font-semibold">
              Version
            </span>
            <div className="flex rounded-sm border border-hairline overflow-hidden">
              {(['v4', 'v7'] as UuidVersion[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onVersion(v)}
                  className={`px-3 py-1.5 font-mono transition-colors ${
                    version === v
                      ? 'bg-primary/15 text-primary'
                      : 'bg-canvas-soft text-mute hover:text-ink'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-mute hidden sm:inline">
              {version === 'v4' ? 'random' : 'time-ordered'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-mute uppercase tracking-wider text-[10px] font-semibold">
              Count
            </span>
            <input
              type="number"
              min={1}
              max={10000}
              value={count}
              onChange={(e) => onCountChange(e.target.value)}
              className="w-20 bg-canvas-soft border border-hairline rounded-sm px-2 py-1.5 text-ink text-xs font-mono focus:outline-none focus:border-primary tabular-nums"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-body hover:text-ink">
            <input
              type="checkbox"
              checked={uppercase}
              onChange={(e) => onUppercase(e.target.checked)}
              className="accent-primary"
            />
            Uppercase
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-body hover:text-ink">
            <input
              type="checkbox"
              checked={noHyphen}
              onChange={(e) => onNoHyphen(e.target.checked)}
              className="accent-primary"
            />
            No hyphens
          </label>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => regenerate()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border border-hairline bg-canvas-soft text-xs text-mute hover:text-ink hover:border-primary/40 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Regenerate
            </button>
            <button
              type="button"
              onClick={copyAll}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border border-primary/40 bg-primary/10 text-xs text-primary hover:bg-primary/20 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy all
            </button>
          </div>
        </div>
      </div>

      {/* Output */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="h-10 px-3 flex items-center justify-between border-b border-hairline shrink-0">
          <span className="text-[10px] font-semibold uppercase tracking-[2px] text-mute flex items-center gap-1.5">
            <Fingerprint className="w-3 h-3" />
            Output
          </span>
          <span className="font-mono text-[11px] text-mute">
            <span className="text-primary font-semibold">{ids.length}</span> UUID
            {ids.length === 1 ? '' : 's'}
          </span>
        </div>
        <pre className="flex-1 overflow-auto p-4 text-sm font-mono text-ink leading-relaxed whitespace-pre">
          {output}
        </pre>
      </div>
    </div>
  );
};
