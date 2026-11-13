import React, { useMemo } from 'react';
import { contrastRatio, parseColor, shades, toHex, toHslString, toRgbString } from '../../core/color/color.ts';
import { AutoGrid, CopyRow, Page, Panel, Toolbar, inputCls, useCopy } from '../../components/ui.tsx';
import { usePersistentState } from '../../lib/storage.ts';

const grade = (r: number) => (r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA large only' : 'Fail');

export const ColorTool: React.FC = () => {
  const [input, setInput] = usePersistentState('color', 'input', '#00d992');
  const copy = useCopy();
  const c = useMemo(() => parseColor(input), [input]);
  const white = { r: 255, g: 255, b: 255, a: 1 };
  const black = { r: 0, g: 0, b: 0, a: 1 };

  return (
    <div className="h-full flex flex-col min-h-0 bg-canvas">
      <Toolbar>
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          placeholder="#00d992 · rgb(0 217 146) · hsl(162, 100%, 43%)"
          className={`${inputCls} flex-1 min-w-[260px] text-base py-2.5`}
        />
        <input
          type="color"
          value={c ? toHex({ ...c, a: 1 }) : '#000000'}
          onChange={(e) => setInput(e.target.value)}
          className="h-10 w-14 bg-transparent border border-hairline rounded-sm cursor-pointer"
          title="Pick a color"
        />
      </Toolbar>
      <Page className="content-start">
        {!c ? (
          <div className="text-sm text-red-400">Not a valid HEX / RGB / HSL color.</div>
        ) : (
          <div className="grid xl:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="h-40 rounded-md border border-hairline" style={{ background: toRgbString(c) }} />
              <Panel title="Formats" bodyClassName="p-4 space-y-2">
                <CopyRow label="HEX" value={toHex(c)} />
                <CopyRow label="RGB" value={toRgbString(c)} />
                <CopyRow label="HSL" value={toHslString(c)} />
                <CopyRow label="CSS var" value={`--color: ${toHex(c)};`} />
              </Panel>
            </div>
            <div className="space-y-6">
              <Panel title="Contrast (WCAG)">
                <AutoGrid min={220}>
                  {[
                    ['On white', white],
                    ['On black', black],
                  ].map(([label, bg]) => {
                    const ratio = contrastRatio(c, bg as typeof white);
                    return (
                      <div key={label as string} className="rounded-md border border-hairline p-4" style={{ background: toRgbString(bg as typeof white), color: toRgbString(c) }}>
                        <div className="text-2xl font-semibold">Aa Sample</div>
                        <div className="text-xs mt-2">
                          {label as string} · {ratio.toFixed(2)}:1 · <strong>{grade(ratio)}</strong>
                        </div>
                      </div>
                    );
                  })}
                </AutoGrid>
              </Panel>
              <Panel title="Shades (click to copy)" bodyClassName="p-4">
                <div className="flex rounded-md overflow-hidden border border-hairline">
                  {shades(c).map((h) => (
                    <button key={h} type="button" title={h} onClick={() => copy(h, `${h} copied`)} className="flex-1 h-20 group relative" style={{ background: h }}>
                      <span className="absolute inset-x-0 bottom-1 text-[10px] font-mono opacity-0 group-hover:opacity-100 mix-blend-difference text-white">{h}</span>
                    </button>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        )}
      </Page>
    </div>
  );
};
