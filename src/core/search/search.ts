import { ASTNode } from '../parse/types.ts';
import { PathSegment } from '../path/types.ts';

export type SearchScope = 'both' | 'keys' | 'values';

export interface SearchOptions {
  query: string;
  scope?: SearchScope;
  matchCase?: boolean;
  useRegex?: boolean;
  maxMatches?: number;
}

export interface SearchMatch {
  id: string;
  path: PathSegment[];
  target: 'key' | 'value';
  text: string;
  matchedText: string;
}

export interface SearchResult {
  matches: SearchMatch[];
  totalFound: number;
  isCapped: boolean;
}

export function searchAST(rootNode: ASTNode, options: SearchOptions): SearchResult {
  const { query, scope = 'both', matchCase = false, useRegex = false, maxMatches = 1000 } = options;

  if (!query || query.trim() === '') {
    return { matches: [], totalFound: 0, isCapped: false };
  }

  let matcher: (text: string) => boolean;

  if (useRegex) {
    try {
      const flags = matchCase ? 'g' : 'gi';
      const reg = new RegExp(query, flags);
      matcher = (text: string) => {
        reg.lastIndex = 0;
        return reg.test(text);
      };
    } catch {
      // Invalid regex pattern
      return { matches: [], totalFound: 0, isCapped: false };
    }
  } else {
    const q = matchCase ? query : query.toLowerCase();
    matcher = (text: string) => {
      const t = matchCase ? text : text.toLowerCase();
      return t.includes(q);
    };
  }

  const matches: SearchMatch[] = [];
  let totalFound = 0;
  let isCapped = false;

  function walk(node: ASTNode, currentPath: PathSegment[]): void {
    if (matches.length >= maxMatches) {
      isCapped = true;
      // We still increment totalFound up to a safe limit or stop
      totalFound++;
      if (totalFound > maxMatches + 1000) return;
    }

    if (node.type === 'object') {
      for (let i = 0; i < node.children.length; i++) {
        const prop = node.children[i];
        const propPath = [...currentPath, prop.key];

        // Check key
        if (scope === 'both' || scope === 'keys') {
          if (matcher(prop.key)) {
            totalFound++;
            if (matches.length < maxMatches) {
              matches.push({
                id: `key-${propPath.join('.')}-${matches.length}`,
                path: propPath,
                target: 'key',
                text: prop.key,
                matchedText: prop.key,
              });
            } else {
              isCapped = true;
            }
          }
        }

        // Walk into value
        walk(prop.value, propPath);
      }
      return;
    }

    if (node.type === 'array') {
      for (let i = 0; i < node.children.length; i++) {
        const item = node.children[i];
        walk(item, [...currentPath, i]);
      }
      return;
    }

    // Primitives (value check)
    if (scope === 'both' || scope === 'values') {
      let valText = '';
      if (node.type === 'string') {
        valText = node.value;
      } else if (node.type === 'number') {
        // Matched on raw text so big numbers are searchable exactly!
        valText = node.raw;
      } else if (node.type === 'boolean') {
        valText = node.value ? 'true' : 'false';
      } else if (node.type === 'null') {
        valText = 'null';
      }

      if (matcher(valText)) {
        totalFound++;
        if (matches.length < maxMatches) {
          matches.push({
            id: `val-${currentPath.join('.')}-${matches.length}`,
            path: currentPath,
            target: 'value',
            text: valText,
            matchedText: valText,
          });
        } else {
          isCapped = true;
        }
      }
    }
  }

  walk(rootNode, []);

  return {
    matches,
    totalFound,
    isCapped,
  };
}
