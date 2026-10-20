import { ASTNode, ObjectNode, ArrayNode, StringNode, NumberNode, BooleanNode, NullNode } from '../parse/types.ts';

export type IndentOption = '2' | '4' | 'tab' | 'minify';

export interface FormatOptions {
  indent?: IndentOption;
  sortKeys?: boolean;
}

export function formatAST(node: ASTNode, options: FormatOptions = {}): string {
  const indentOpt = options.indent ?? '2';
  const sortKeys = options.sortKeys ?? false;
  const isMinify = indentOpt === 'minify';

  const indentStr = isMinify ? '' : indentOpt === 'tab' ? '\t' : ' '.repeat(parseInt(indentOpt, 10) || 2);

  function formatValue(n: ASTNode, depth: number): string {
    switch (n.type) {
      case 'string':
        return JSON.stringify(n.value);

      case 'number':
        // Output normalized strict JSON representation, preserving lossless big ints
        return n.normalized;

      case 'boolean':
        return n.value ? 'true' : 'false';

      case 'null':
        return 'null';

      case 'array': {
        if (n.children.length === 0) {
          return '[]';
        }
        if (isMinify) {
          const items = n.children.map((child) => formatValue(child, depth + 1)).join(',');
          return `[${items}]`;
        }
        const currentIndent = indentStr.repeat(depth);
        const childIndent = indentStr.repeat(depth + 1);
        const items = n.children
          .map((child) => `${childIndent}${formatValue(child, depth + 1)}`)
          .join(',\n');
        return `[\n${items}\n${currentIndent}]`;
      }

      case 'object': {
        if (n.children.length === 0) {
          return '{}';
        }
        let props = [...n.children];
        if (sortKeys) {
          props.sort((a, b) => a.key.localeCompare(b.key));
        }

        if (isMinify) {
          const items = props
            .map((p) => `${JSON.stringify(p.key)}:${formatValue(p.value, depth + 1)}`)
            .join(',');
          return `{${items}}`;
        }

        const currentIndent = indentStr.repeat(depth);
        const childIndent = indentStr.repeat(depth + 1);
        const items = props
          .map((p) => `${childIndent}${JSON.stringify(p.key)}: ${formatValue(p.value, depth + 1)}`)
          .join(',\n');
        return `{\n${items}\n${currentIndent}}`;
      }
    }
  }

  return formatValue(node, 0);
}

export interface SizeMetrics {
  inputBytes: number;
  outputBytes: number;
  diffBytes: number;
  reductionPercentage: number;
  inputFormatted: string;
  outputFormatted: string;
}

export function calculateSizeMetrics(inputStr: string, outputStr: string): SizeMetrics {
  const encoder = new TextEncoder();
  const inputBytes = encoder.encode(inputStr).length;
  const outputBytes = encoder.encode(outputStr).length;
  const diffBytes = outputBytes - inputBytes;
  const reductionPercentage = inputBytes === 0 ? 0 : Math.round(((inputBytes - outputBytes) / inputBytes) * 100);

  return {
    inputBytes,
    outputBytes,
    diffBytes,
    reductionPercentage,
    inputFormatted: formatBytes(inputBytes),
    outputFormatted: formatBytes(outputBytes),
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  const val = (bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1);
  return `${val} ${sizes[i]}`;
}
