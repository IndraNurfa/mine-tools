import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ToastProvider } from '../../components/Toast.tsx';

// Monaco-backed tools need a real browser; everything else should render on first paint.
const TOOLS: [string, () => Promise<Record<string, React.ComponentType<any>>>, string][] = [
  ['list-formatter', () => import('../list-formatter/ListFormatterTool.tsx'), 'ListFormatterTool'],
  ['char-count', () => import('../char-count/CharCountTool.tsx'), 'CharCountTool'],
  ['uuid', () => import('../uuid/UuidTool.tsx'), 'UuidTool'],
  ['encoder', () => import('../encoder/EncoderTool.tsx'), 'EncoderTool'],
  ['jwt', () => import('../jwt/JwtTool.tsx'), 'JwtTool'],
  ['timestamp', () => import('../timestamp/TimestampTool.tsx'), 'TimestampTool'],
  ['hash', () => import('../hash/HashTool.tsx'), 'HashTool'],
  ['regex', () => import('../regex/RegexTool.tsx'), 'RegexTool'],
  ['case', () => import('../case/CaseTool.tsx'), 'CaseTool'],
  ['lines', () => import('../lines/LinesTool.tsx'), 'LinesTool'],
  ['json-convert', () => import('../json-convert/JsonConvertTool.tsx'), 'JsonConvertTool'],
  ['cron', () => import('../cron/CronTool.tsx'), 'CronTool'],
  ['color', () => import('../color/ColorTool.tsx'), 'ColorTool'],
  ['url', () => import('../url/UrlTool.tsx'), 'UrlTool'],
  ['chmod', () => import('../chmod/ChmodTool.tsx'), 'ChmodTool'],
  ['scratchpad', () => import('../scratchpad/ScratchpadTool.tsx'), 'ScratchpadTool'],
  ['random', () => import('../random/RandomTool.tsx'), 'RandomTool'],
  ['lorem', () => import('../lorem/LoremTool.tsx'), 'LoremTool'],
  ['numbers', () => import('../numbers/NumbersTool.tsx'), 'NumbersTool'],
  ['date-calc', () => import('../date-calc/DateCalcTool.tsx'), 'DateCalcTool'],
  ['csv-viewer', () => import('../csv-viewer/CsvViewerTool.tsx'), 'CsvViewerTool'],
  ['csv-diff', () => import('../csv-diff/CsvDiffTool.tsx'), 'CsvDiffTool'],
  ['api-client', () => import('../api-client/ApiClientTool.tsx'), 'ApiClientTool'],
  ['curl', () => import('../curl/CurlTool.tsx'), 'CurlTool'],
  ['http-status', () => import('../http-status/HttpStatusTool.tsx'), 'HttpStatusTool'],
];

describe('tool smoke render', () => {
  for (const [id, load, name] of TOOLS) {
    it(`${id} renders`, async () => {
      const Comp = (await load())[name]!;
      const html = renderToString(
        <ToastProvider>
          <Comp />
        </ToastProvider>,
      );
      expect(html.length).toBeGreaterThan(100);
    });
  }
});

describe('registry', () => {
  it('has unique ids and routes matching ids', async () => {
    const { TOOL_REGISTRY } = await import('../../registry.ts');
    const ids = TOOL_REGISTRY.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of TOOL_REGISTRY) expect(t.route).toBe('/' + t.id);
  });
  it('only content-heavy tools are resettable', async () => {
    const { TOOL_REGISTRY } = await import('../../registry.ts');
    const none = ['uuid', 'color', 'cron', 'chmod', 'random', 'lorem', 'numbers', 'date-calc', 'http-status', 'timestamp', 'scratchpad'];
    for (const id of none) expect(TOOL_REGISTRY.find((t) => t.id === id)!.resettable).toBeFalsy();
  });
});
