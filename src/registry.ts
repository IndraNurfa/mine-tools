import React from 'react';
import { FileCode, GitCompare, Route, List, Type, Fingerprint } from 'lucide-react';

export interface ToolItem {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
  route: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
}

export const TOOL_REGISTRY: ToolItem[] = [
  {
    id: 'formatter',
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
