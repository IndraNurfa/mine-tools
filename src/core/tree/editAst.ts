import { ASTNode, SourceLocation } from '../parse/types.ts';
import { PathSegment } from '../path/format.ts';
import { parseLooseJSON } from '../parse/parser.ts';

const ZERO: SourceLocation = { offset: 0, line: 1, column: 1 };

function loc(): SourceLocation {
  return { ...ZERO };
}

/** Build a minimal AST node from edited text (value side). */
export function parseEditedValue(text: string): ASTNode {
  const trimmed = text.trim();
  if (trimmed === '') {
    return { type: 'string', value: '', raw: '""', start: loc(), end: loc() };
  }
  try {
    return parseLooseJSON(trimmed);
  } catch {
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      const inner = trimmed.slice(1, -1);
      return {
        type: 'string',
        value: inner,
        raw: JSON.stringify(inner),
        start: loc(),
        end: loc(),
      };
    }
    return {
      type: 'string',
      value: trimmed,
      raw: JSON.stringify(trimmed),
      start: loc(),
      end: loc(),
    };
  }
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/**
 * Apply an inline tree edit. Returns a new root AST (deep clone).
 * - kind 'value': replace node at path
 * - kind 'key': rename property; path points at the property value (TreeView path)
 */
export function applyTokenEdit(
  root: ASTNode,
  path: PathSegment[],
  kind: 'key' | 'value',
  newText: string,
): ASTNode {
  const cloned = deepClone(root);

  if (path.length === 0) {
    if (kind === 'value') return parseEditedValue(newText);
    return cloned;
  }

  let parent: ASTNode = cloned;
  for (let i = 0; i < path.length - 1; i++) {
    const seg = path[i]!;
    if (parent.type === 'object') {
      const prop = parent.children.find((c) => c.key === seg);
      if (!prop) return cloned;
      parent = prop.value;
    } else if (parent.type === 'array' && typeof seg === 'number') {
      if (seg < 0 || seg >= parent.children.length) return cloned;
      parent = parent.children[seg]!;
    } else {
      return cloned;
    }
  }

  const last = path[path.length - 1]!;

  if (kind === 'key') {
    if (parent.type !== 'object' || typeof last !== 'string') return cloned;
    const prop = parent.children.find((c) => c.key === last);
    if (!prop) return cloned;
    const nextKey = newText.replace(/^["']|["']$/g, '');
    prop.key = nextKey;
    prop.rawKey = JSON.stringify(nextKey);
    return cloned;
  }

  const newNode = parseEditedValue(newText);
  if (parent.type === 'object' && typeof last === 'string') {
    const prop = parent.children.find((c) => c.key === last);
    if (!prop) return cloned;
    prop.value = newNode;
    return cloned;
  }
  if (parent.type === 'array' && typeof last === 'number') {
    if (last < 0 || last >= parent.children.length) return cloned;
    parent.children[last] = newNode;
    return cloned;
  }
  return cloned;
}

/** Display text for a value token (strings include JSON quotes). */
export function displayValueToken(node: ASTNode): string {
  switch (node.type) {
    case 'string':
      return JSON.stringify(node.value);
    case 'number':
      return node.raw;
    case 'boolean':
      return node.value ? 'true' : 'false';
    case 'null':
      return 'null';
    default:
      return node.type === 'object' ? '{…}' : '[…]';
  }
}

/** Display text for a key token (quoted like the tree UI). */
export function displayKeyToken(key: string): string {
  return JSON.stringify(key);
}
