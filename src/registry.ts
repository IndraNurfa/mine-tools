import React from 'react';
import { FormatterTool } from './tools/formatter/FormatterTool.tsx';
import { DiffTool } from './tools/diff/DiffTool.tsx';
import { FileCode, GitCompare } from 'lucide-react';

export interface ToolItem {
  id: string;
  path: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType<any>;
}

export const TOOL_REGISTRY: ToolItem[] = [
  {
    id: 'formatter',
    path: '/formatter',
    name: 'JSON Formatter',
    description: 'Format strict JSON, inspect interactive tree, and repair broken payloads',
    icon: FileCode,
    component: FormatterTool,
  },
  {
    id: 'diff',
    path: '/diff',
    name: 'Compare / Diff',
    description: 'Monaco side-by-side text diff & semantic AST change inspector',
    icon: GitCompare,
    component: DiffTool,
  },
];
