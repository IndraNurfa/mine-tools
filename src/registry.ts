import React from 'react';
import { FileCode, GitCompare, Route } from 'lucide-react';

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
      import('./tools/formatter/FormatterTool.tsx').then((m) => ({ default: m.FormatterTool }))
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
      import('./tools/path-finder/PathFinderTool.tsx').then((m) => ({ default: m.PathFinderTool }))
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
      import('./tools/diff/DiffTool.tsx').then((m) => ({ default: m.DiffTool }))
    ),
  },
];
