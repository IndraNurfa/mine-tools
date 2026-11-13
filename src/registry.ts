import React from 'react';
import {
  FileCode, GitCompare, Route, List, Type, Fingerprint, Binary, KeyRound, Clock,
  Hash, Regex, CaseSensitive, ArrowDownAZ, FileJson, CalendarClock, Palette, Link2,
  ShieldCheck, NotebookPen, Dices, TextQuote, Calculator, CalendarDays, Diff, Globe,
  Table, GitCompareArrows, Send, Terminal,
} from 'lucide-react';

export interface ToolItem {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
  route: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  /** Show the header Reset button (clears this tool's saved input/options). Opt-in: only for tools that keep user content worth wiping. */
  resettable?: boolean;
}

export const TOOL_REGISTRY: ToolItem[] = [
  {
    id: 'formatter',
    resettable: true,
    name: 'JSON Formatter',
    description: 'Format strict JSON, inspect interactive tree, and repair broken payloads',
    icon: FileCode,
    group: 'JSON',
    route: '/formatter',
    component: React.lazy(() =>
      import('./tools/formatter/FormatterTool.tsx').then((m) => ({ default: m.FormatterTool })),
    ),
  },
  {
    id: 'path-finder',
    resettable: true,
    name: 'JSON Path Finder',
    description: 'Explore JSON tree hierarchy and copy JS, JSONPath, or Gjson node paths on click',
    icon: Route,
    group: 'JSON',
    route: '/path-finder',
    component: React.lazy(() =>
      import('./tools/path-finder/PathFinderTool.tsx').then((m) => ({ default: m.PathFinderTool })),
    ),
  },
  {
    id: 'diff',
    resettable: true,
    name: 'JSON Diff',
    description: 'Monaco side-by-side text diff & semantic AST change inspector',
    icon: GitCompare,
    group: 'Diff',
    route: '/diff',
    component: React.lazy(() =>
      import('./tools/diff/DiffTool.tsx').then((m) => ({ default: m.DiffTool })),
    ),
  },
  {
    id: 'list-formatter',
    resettable: true,
    name: 'List Formatter',
    description: 'Join lines into plain or quoted lists — TEXTJOIN without the spreadsheet',
    icon: List,
    group: 'Text',
    route: '/list-formatter',
    component: React.lazy(() =>
      import('./tools/list-formatter/ListFormatterTool.tsx').then((m) => ({
        default: m.ListFormatterTool,
      })),
    ),
  },
  {
    id: 'char-count',
    resettable: true,
    name: 'Char Count',
    description: 'Live character, word, line and UTF-8 byte counts',
    icon: Type,
    group: 'Text',
    route: '/char-count',
    component: React.lazy(() =>
      import('./tools/char-count/CharCountTool.tsx').then((m) => ({ default: m.CharCountTool })),
    ),
  },
  {
    id: 'uuid',
    name: 'UUID Generator',
    description: 'Bulk UUID v4 and v7 with uppercase and no-hyphen options',
    icon: Fingerprint,
    group: 'Generate',
    route: '/uuid',
    component: React.lazy(() =>
      import('./tools/uuid/UuidTool.tsx').then((m) => ({ default: m.UuidTool })),
    ),
  },
  {
    id: 'json-convert',
    resettable: true,
    name: 'JSON Convert',
    description: 'JSON to YAML, CSV or TypeScript interfaces',
    icon: FileJson,
    group: 'JSON',
    route: '/json-convert',
    component: React.lazy(() =>
      import('./tools/json-convert/JsonConvertTool.tsx').then((m) => ({ default: m.JsonConvertTool })),
    ),
  },
  {
    id: 'encoder',
    resettable: true,
    name: 'Encode / Decode',
    description: 'Base64, URL, HTML entities and hex — UTF-8 safe',
    icon: Binary,
    group: 'Encode',
    route: '/encoder',
    component: React.lazy(() =>
      import('./tools/encoder/EncoderTool.tsx').then((m) => ({ default: m.EncoderTool })),
    ),
  },
  {
    id: 'jwt',
    resettable: true,
    name: 'JWT Decoder',
    description: 'Inspect header, payload and expiry of a JWT (no verification)',
    icon: KeyRound,
    group: 'Encode',
    route: '/jwt',
    component: React.lazy(() =>
      import('./tools/jwt/JwtTool.tsx').then((m) => ({ default: m.JwtTool })),
    ),
  },
  {
    id: 'hash',
    resettable: true,
    name: 'Hash / HMAC',
    description: 'MD5, SHA-1/256/384/512 and HMAC of any text',
    icon: Hash,
    group: 'Encode',
    route: '/hash',
    component: React.lazy(() =>
      import('./tools/hash/HashTool.tsx').then((m) => ({ default: m.HashTool })),
    ),
  },
  {
    id: 'case',
    resettable: true,
    name: 'Case Converter',
    description: 'camel, snake, kebab, Pascal, CONSTANT and more',
    icon: CaseSensitive,
    group: 'Text',
    route: '/case',
    component: React.lazy(() =>
      import('./tools/case/CaseTool.tsx').then((m) => ({ default: m.CaseTool })),
    ),
  },
  {
    id: 'lines',
    resettable: true,
    name: 'Line Tools',
    description: 'Sort, dedupe, trim and clean up lines',
    icon: ArrowDownAZ,
    group: 'Text',
    route: '/lines',
    component: React.lazy(() =>
      import('./tools/lines/LinesTool.tsx').then((m) => ({ default: m.LinesTool })),
    ),
  },
  {
    id: 'regex',
    resettable: true,
    name: 'Regex Tester',
    description: 'Live matches, groups and replace preview',
    icon: Regex,
    group: 'Text',
    route: '/regex',
    component: React.lazy(() =>
      import('./tools/regex/RegexTool.tsx').then((m) => ({ default: m.RegexTool })),
    ),
  },
  {
    id: 'timestamp',
    name: 'Timestamp',
    description: 'Unix / ISO converter with time zones and relative time',
    icon: Clock,
    group: 'Generate',
    route: '/timestamp',
    component: React.lazy(() =>
      import('./tools/timestamp/TimestampTool.tsx').then((m) => ({ default: m.TimestampTool })),
    ),
  },
  {
    id: 'text-diff',
    resettable: true,
    name: 'Text Diff',
    description: 'Side-by-side diff for any text or code, with syntax highlighting',
    icon: Diff,
    group: 'Diff',
    route: '/text-diff',
    component: React.lazy(() =>
      import('./tools/text-diff/TextDiffTool.tsx').then((m) => ({ default: m.TextDiffTool })),
    ),
  },
  {
    id: 'url',
    resettable: true,
    name: 'URL Parser',
    description: 'Break a URL into parts and edit its query params live',
    icon: Link2,
    group: 'Web',
    route: '/url',
    component: React.lazy(() =>
      import('./tools/url/UrlTool.tsx').then((m) => ({ default: m.UrlTool })),
    ),
  },
  {
    id: 'http-status',
    name: 'HTTP Status',
    description: 'Searchable cheat sheet of HTTP status codes',
    icon: Globe,
    group: 'Web',
    route: '/http-status',
    component: React.lazy(() =>
      import('./tools/http-status/HttpStatusTool.tsx').then((m) => ({ default: m.HttpStatusTool })),
    ),
  },
  {
    id: 'color',
    name: 'Color Converter',
    description: 'HEX / RGB / HSL with contrast check and shades',
    icon: Palette,
    group: 'Web',
    route: '/color',
    component: React.lazy(() =>
      import('./tools/color/ColorTool.tsx').then((m) => ({ default: m.ColorTool })),
    ),
  },
  {
    id: 'cron',
    name: 'Cron Explainer',
    description: 'Plain-English cron meaning plus the next run times',
    icon: CalendarClock,
    group: 'Time',
    route: '/cron',
    component: React.lazy(() =>
      import('./tools/cron/CronTool.tsx').then((m) => ({ default: m.CronTool })),
    ),
  },
  {
    id: 'date-calc',
    name: 'Date Calculator',
    description: 'Difference between dates, add/subtract, week & day numbers',
    icon: CalendarDays,
    group: 'Time',
    route: '/date-calc',
    component: React.lazy(() =>
      import('./tools/date-calc/DateCalcTool.tsx').then((m) => ({ default: m.DateCalcTool })),
    ),
  },
  {
    id: 'numbers',
    name: 'Bases & Sizes',
    description: 'Hex / binary / octal converter and KB↔KiB data sizes',
    icon: Calculator,
    group: 'Generate',
    route: '/numbers',
    component: React.lazy(() =>
      import('./tools/numbers/NumbersTool.tsx').then((m) => ({ default: m.NumbersTool })),
    ),
  },
  {
    id: 'random',
    name: 'Random / Password',
    description: 'Secure passwords, tokens, numbers and list picker',
    icon: Dices,
    group: 'Generate',
    route: '/random',
    component: React.lazy(() =>
      import('./tools/random/RandomTool.tsx').then((m) => ({ default: m.RandomTool })),
    ),
  },
  {
    id: 'lorem',
    name: 'Lorem Ipsum',
    description: 'Placeholder paragraphs, sentences or words',
    icon: TextQuote,
    group: 'Generate',
    route: '/lorem',
    component: React.lazy(() =>
      import('./tools/lorem/LoremTool.tsx').then((m) => ({ default: m.LoremTool })),
    ),
  },
  {
    id: 'chmod',
    name: 'Chmod Calculator',
    description: 'Unix permissions: octal, symbolic and checkboxes',
    icon: ShieldCheck,
    group: 'Web',
    route: '/chmod',
    component: React.lazy(() =>
      import('./tools/chmod/ChmodTool.tsx').then((m) => ({ default: m.ChmodTool })),
    ),
  },
  {
    id: 'scratchpad',
    name: 'Scratchpad',
    description: 'Persistent multi-tab notes for snippets and todos',
    icon: NotebookPen,
    group: 'Text',
    route: '/scratchpad',
    component: React.lazy(() =>
      import('./tools/scratchpad/ScratchpadTool.tsx').then((m) => ({ default: m.ScratchpadTool })),
    ),
  },
  {
    id: 'csv-viewer',
    resettable: true,
    name: 'CSV Viewer',
    description: 'Table preview with sort, filter, column stats, transpose and export to JSON/Markdown/SQL',
    icon: Table,
    group: 'CSV',
    route: '/csv-viewer',
    component: React.lazy(() =>
      import('./tools/csv-viewer/CsvViewerTool.tsx').then((m) => ({ default: m.CsvViewerTool })),
    ),
  },
  {
    id: 'csv-diff',
    resettable: true,
    name: 'CSV Diff',
    description: 'Compare two CSVs by key column or row position, with cell-level changes',
    icon: GitCompareArrows,
    group: 'CSV',
    route: '/csv-diff',
    component: React.lazy(() =>
      import('./tools/csv-diff/CsvDiffTool.tsx').then((m) => ({ default: m.CsvDiffTool })),
    ),
  },
  {
    id: 'api-client',
    resettable: true,
    name: 'API Client',
    description: 'Postman-style request builder: params, headers, auth, body, variables and history',
    icon: Send,
    group: 'API',
    route: '/api-client',
    component: React.lazy(() =>
      import('./tools/api-client/ApiClientTool.tsx').then((m) => ({ default: m.ApiClientTool })),
    ),
  },
  {
    id: 'curl',
    resettable: true,
    name: 'cURL Runner',
    description: 'Paste a cURL, see it parsed, convert to fetch/axios/Python and send it',
    icon: Terminal,
    group: 'API',
    route: '/curl',
    component: React.lazy(() =>
      import('./tools/curl/CurlTool.tsx').then((m) => ({ default: m.CurlTool })),
    ),
  },
];

/** Group tools by `group`, preserving first-seen order from TOOL_REGISTRY. */
export function groupTools(
  tools: ToolItem[] = TOOL_REGISTRY,
): { group: string; tools: ToolItem[] }[] {
  const map = new Map<string, ToolItem[]>();
  for (const tool of tools) {
    const list = map.get(tool.group) || [];
    list.push(tool);
    map.set(tool.group, list);
  }
  return Array.from(map.entries()).map(([group, tools]) => ({ group, tools }));
}
