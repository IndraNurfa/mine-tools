import React from 'react';
import { COMMON_MODES, octalToPerms, permsToOctal, permsToSymbolic, symbolicToPerms, type Perms } from '../../core/chmod/chmod.ts';
import { AutoGrid, CopyRow, Page, Panel, Toolbar, inputCls } from '../../components/ui.tsx';
import { usePersistentState } from '../../lib/storage.ts';

const WHO = ['owner', 'group', 'other'] as const;
const BITS = ['r', 'w', 'x'] as const;

export const ChmodTool: React.FC = () => {
  const [octal, setOctal] = usePersistentState('chmod', 'octal', '755');
  const perms: Perms = octalToPerms(octal) ?? octalToPerms('644')!;
  const valid = octalToPerms(octal) !== null;
  const sym = permsToSymbolic(perms);

  const toggle = (w: (typeof WHO)[number], b: (typeof BITS)[number]) =>
    setOctal(permsToOctal({ ...perms, [w]: { ...perms[w], [b]: !perms[w][b] } }));

  return (
    <div className="h-full flex flex-col min-h-0 bg-canvas">
      <Toolbar>
        <label className="flex items-center gap-2 text-xs text-body">
          Octal
          <input
            autoFocus
            value={octal}
            onChange={(e) => setOctal(e.target.value)}
            maxLength={4}
            className={`${inputCls} w-20 text-base py-2 text-center ${valid ? '' : 'border-red-400'}`}
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-body">
          Symbolic
          <input
            value={sym}
            onChange={(e) => {
              const p = symbolicToPerms(e.target.value);
              if (p) setOctal(permsToOctal(p));
            }}
            className={`${inputCls} w-32 text-base py-2 text-center`}
          />
        </label>
      </Toolbar>
      <Page className="grid xl:grid-cols-2 gap-6 content-start">
        <div className="space-y-6">
          <Panel title="Permissions" bodyClassName="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[1.5px] text-mute border-b border-hairline">
                  <th className="text-left p-4 font-semibold">Who</th>
                  <th className="p-4 font-semibold">Read · 4</th>
                  <th className="p-4 font-semibold">Write · 2</th>
                  <th className="p-4 font-semibold">Execute · 1</th>
                </tr>
              </thead>
              <tbody>
                {WHO.map((w) => (
                  <tr key={w} className="border-b border-hairline last:border-0">
                    <td className="p-4 capitalize text-body">{w}</td>
                    {BITS.map((b) => (
                      <td key={b} className="p-4 text-center">
                        <input type="checkbox" checked={perms[w][b]} onChange={() => toggle(w, b)} className="accent-primary w-5 h-5 cursor-pointer" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          <Panel title="Commands" bodyClassName="p-4 space-y-2">
            <CopyRow label="Command" value={`chmod ${permsToOctal(perms)} file`} />
            <CopyRow label="Recursive" value={`chmod -R ${permsToOctal(perms)} dir/`} />
            <CopyRow label="ls -l" value={`-${sym}`} />
          </Panel>
        </div>
        <Panel title="Common modes">
          <AutoGrid min={260} gap={8}>
            {COMMON_MODES.map((m) => (
              <button
                key={m.mode}
                type="button"
                onClick={() => setOctal(m.mode)}
                className={`flex items-center gap-4 px-4 py-3 rounded-md border text-left transition-colors ${
                  octal === m.mode ? 'border-primary/50 bg-primary/10' : 'border-hairline bg-canvas-soft hover:border-primary/40'
                }`}
              >
                <span className="font-mono text-lg text-primary">{m.mode}</span>
                <span className="text-[13px] text-body">{m.note}</span>
              </button>
            ))}
          </AutoGrid>
        </Panel>
      </Page>
    </div>
  );
};
