import React, { useMemo, useState } from 'react';
import { usePersistentState } from '../../lib/storage.ts';
import { ArrowDownUp } from 'lucide-react';
import {
  base64Decode,
  base64Encode,
  hexDecode,
  hexEncode,
  jsonEscape,
  jsonUnescape,
  unicodeEscape,
  unicodeUnescape,
  htmlEscape,
  htmlUnescape,
  urlDecode,
  urlEncode,
} from '../../core/encode/encode.ts';
import { PaneHeader, Segmented, TextBtn, Toolbar, textareaCls, usePaste } from '../../components/ui.tsx';

type Mode = 'base64' | 'base64url' | 'url' | 'urlfull' | 'html' | 'hex' | 'jsonstr' | 'unicode';
const MODES: { id: Mode; label: string }[] = [
  { id: 'base64', label: 'Base64' },
  { id: 'base64url', label: 'Base64 URL' },
  { id: 'url', label: 'URL' },
  { id: 'urlfull', label: 'URL (full)' },
  { id: 'html', label: 'HTML' },
  { id: 'hex', label: 'Hex' },
  { id: 'jsonstr', label: 'JSON string' },
  { id: 'unicode', label: '\\uXXXX' },
];

function run(mode: Mode, dir: 'encode' | 'decode', s: string): string {
  const enc = dir === 'encode';
  switch (mode) {
    case 'base64':
      return enc ? base64Encode(s) : base64Decode(s);
    case 'base64url':
      return enc ? base64Encode(s, true) : base64Decode(s);
    case 'url':
      return enc ? urlEncode(s) : urlDecode(s);
    case 'urlfull':
      return enc ? urlEncode(s, 'full') : urlDecode(s);
    case 'html':
      return enc ? htmlEscape(s) : htmlUnescape(s);
    case 'hex':
      return enc ? hexEncode(s) : hexDecode(s);
    case 'jsonstr':
      return enc ? jsonEscape(s) : jsonUnescape(s);
    case 'unicode':
      return enc ? unicodeEscape(s) : unicodeUnescape(s);
  }
}

export const EncoderTool: React.FC = () => {
  const [mode, setMode] = usePersistentState<Mode>('encoder', 'mode', 'base64');
  const [dir, setDir] = usePersistentState<'encode' | 'decode'>('encoder', 'dir', 'encode');
  const [input, setInput] = usePersistentState('encoder', 'input', 'Hello, Toolbox! 👋 héllo 世界');
  const paste = usePaste(setInput);

  const { output, error } = useMemo(() => {
    if (!input) return { output: '', error: '' };
    try {
      return { output: run(mode, dir, input), error: '' };
    } catch (e) {
      return { output: '', error: (e as Error).message || 'Invalid input' };
    }
  }, [mode, dir, input]);

  const swap = () => {
    setInput(output);
    setDir(dir === 'encode' ? 'decode' : 'encode');
  };

  return (
    <div className="h-full flex flex-col min-h-0 bg-canvas">
      <Toolbar>
        <Segmented value={mode} options={MODES} onChange={setMode} />
        <Segmented
          value={dir}
          options={[
            { id: 'encode', label: 'Encode' },
            { id: 'decode', label: 'Decode' },
          ]}
          onChange={setDir}
        />
        <TextBtn onClick={swap}>
          <ArrowDownUp className="w-3.5 h-3.5" />
          Output → input
        </TextBtn>
      </Toolbar>
      <div className="flex-1 min-h-0 grid grid-rows-2 lg:grid-rows-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-hairline">
        <div className="flex flex-col min-h-0">
          <PaneHeader title="Input" onPaste={paste} onClear={() => setInput('')} />
          <textarea
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder="Type or paste…"
            className={textareaCls}
          />
        </div>
        <div className="flex flex-col min-h-0">
          <PaneHeader
            title="Output"
            copyText={output}
            extra={error ? <span className="text-xs text-red-400 mr-2">{error}</span> : undefined}
          />
          <textarea readOnly value={output} spellCheck={false} className={textareaCls} />
        </div>
      </div>
    </div>
  );
};
