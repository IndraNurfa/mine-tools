import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ASTNode, ObjectNode, ArrayNode, PropertyNode } from '../core/parse/types.ts';
import { PathFormat, PathSegment, formatPath } from '../core/path/format.ts';
import { searchAST, SearchScope, SearchMatch } from '../core/search/search.ts';
import { TreeSearchBar } from './TreeSearchBar.tsx';
import { useToast } from './Toast.tsx';
import { ChevronRight, ChevronDown, Copy, Check, Search, ChevronsUpDown, ChevronsDownUp } from 'lucide-react';

interface TreeViewProps {
  ast: ASTNode;
  pathFormat: PathFormat;
  onPathFormatChange: (fmt: PathFormat) => void;
  onSelectPath?: (path: PathSegment[], formatted: string) => void;
}

export const TreeView: React.FC<TreeViewProps> = ({
  ast,
  pathFormat,
  onPathFormatChange,
  onSelectPath,
}) => {
  const { showToast } = useToast();
  const treeContainerRef = useRef<HTMLDivElement>(null);

  // Expanded paths set
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    initial.add('[]');
    if (ast.type === 'object') {
      for (const p of ast.children) {
        if (p.value.type === 'object' || p.value.type === 'array') {
          initial.add(JSON.stringify([p.key]));
        }
      }
    } else if (ast.type === 'array') {
      for (let i = 0; i < Math.min(ast.children.length, 20); i++) {
        const item = ast.children[i];
        if (item.type === 'object' || item.type === 'array') {
          initial.add(JSON.stringify([i]));
        }
      }
    }
    return initial;
  });

  // Current selected path (for path bar and manual copy)
  const [activePath, setActivePath] = useState<PathSegment[]>([]);
  const [copiedRecently, setCopiedRecently] = useState(false);

  // Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('both');
  const [searchMatchCase, setSearchMatchCase] = useState(false);
  const [searchUseRegex, setSearchUseRegex] = useState(false);
  const [searchCurrentIndex, setSearchCurrentIndex] = useState(0);

  // Debounced search query
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Execute AST Search
  const searchResult = useMemo(() => {
    if (!debouncedQuery) {
      return { matches: [], totalFound: 0, isCapped: false };
    }
    return searchAST(ast, {
      query: debouncedQuery,
      scope: searchScope,
      matchCase: searchMatchCase,
      useRegex: searchUseRegex,
      maxMatches: 1000,
    });
  }, [ast, debouncedQuery, searchScope, searchMatchCase, searchUseRegex]);

  // Handle Ctrl+F / Cmd+F on tree container
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        const target = e.target as HTMLElement;
        if (treeContainerRef.current?.contains(target) || target === document.body) {
          e.preventDefault();
          e.stopPropagation();
          setIsSearchOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  // Jump to active search match
  const jumpToMatch = useCallback(
    (index: number) => {
      if (searchResult.matches.length === 0) return;
      const match = searchResult.matches[index];
      if (!match) return;

      setSearchCurrentIndex(index);
      setActivePath(match.path);

      // Auto-expand all ancestors of match
      setExpandedPaths((prev) => {
        const next = new Set(prev);
        const sub: PathSegment[] = [];
        for (let i = 0; i < match.path.length; i++) {
          next.add(JSON.stringify(sub));
          sub.push(match.path[i]);
        }
        return next;
      });

      // Scroll into view
      setTimeout(() => {
        const elementId = `tree-node-${match.path.join('-')}`;
        const el = document.getElementById(elementId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 50);
    },
    [searchResult.matches]
  );

  useEffect(() => {
    if (searchResult.matches.length > 0) {
      jumpToMatch(0);
    } else {
      setSearchCurrentIndex(0);
    }
  }, [searchResult.matches]);

  // Expand / Collapse Helpers
  const handleExpandAll = () => {
    const all = new Set<string>();
    function walk(node: ASTNode, path: PathSegment[]) {
      if (node.type === 'object') {
        all.add(JSON.stringify(path));
        for (const p of node.children) {
          walk(p.value, [...path, p.key]);
        }
      } else if (node.type === 'array') {
        all.add(JSON.stringify(path));
        for (let i = 0; i < node.children.length; i++) {
          walk(node.children[i], [...path, i]);
        }
      }
    }
    walk(ast, []);
    setExpandedPaths(all);
  };

  const handleCollapseAll = () => {
    setExpandedPaths(new Set(['[]']));
  };

  const toggleExpand = (pathKey: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(pathKey)) {
        next.delete(pathKey);
      } else {
        next.add(pathKey);
      }
      return next;
    });
  };

  // Select path on click (DOES NOT auto-copy to clipboard)
  const handleItemSelect = (path: PathSegment[], e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActivePath(path);
    if (onSelectPath) {
      const formatted = formatPath(path, pathFormat);
      onSelectPath(path, formatted);
    }
  };

  const currentFormattedPath = formatPath(activePath, pathFormat);

  // Prominent Copy Action
  const handleManualCopyPath = () => {
    const textToCopy = currentFormattedPath || '<root>';
    navigator.clipboard.writeText(currentFormattedPath);
    setCopiedRecently(true);
    setTimeout(() => setCopiedRecently(false), 2000);
    showToast('Copied path to clipboard', { code: textToCopy });
  };

  return (
    <div
      ref={treeContainerRef}
      tabIndex={0}
      className="flex flex-col h-full w-full bg-canvas select-text outline-none focus:ring-1 focus:ring-primary/30"
    >
      {/* 1. TOP PROMINENT PATH BAR WITH LARGE COPY BUTTON */}
      <div className="border-b border-hairline bg-canvas-soft p-3 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-mute shrink-0">
              Selected Path:
            </span>
            <div
              onClick={handleManualCopyPath}
              className="font-mono text-sm text-primary font-medium truncate bg-canvas px-3 py-1.5 rounded-sm border border-hairline flex-1 cursor-pointer hover:border-primary/50 transition-colors"
              title="Click to copy"
            >
              {currentFormattedPath || '<root>'}
            </div>
          </div>

          {/* Large, Accessible Copy Button */}
          <button
            onClick={handleManualCopyPath}
            className={`flex items-center gap-2 px-4 py-2 rounded-sm font-semibold text-xs transition-all shadow-sm shrink-0 active:scale-95 ${
              copiedRecently
                ? 'bg-primary-soft text-canvas'
                : 'bg-primary hover:bg-primary-soft text-canvas'
            }`}
            title="Copy selected path to clipboard"
          >
            {copiedRecently ? (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 stroke-[2.5]" />
                <span>Copy Path</span>
              </>
            )}
          </button>
        </div>

        {/* Format Selector & Tree Actions Row */}
        <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-hairline/40">
          <div className="flex items-center gap-2">
            <span className="text-mute text-[11px]">Format:</span>
            <div className="flex items-center bg-canvas border border-hairline rounded-sm p-0.5">
              <button
                onClick={() => onPathFormatChange('js')}
                className={`px-2 py-0.5 rounded-xs font-mono text-[11px] transition-colors ${
                  pathFormat === 'js'
                    ? 'bg-primary text-canvas font-semibold'
                    : 'text-mute hover:text-ink'
                }`}
              >
                JS
              </button>
              <button
                onClick={() => onPathFormatChange('jsonpath')}
                className={`px-2 py-0.5 rounded-xs font-mono text-[11px] transition-colors ${
                  pathFormat === 'jsonpath'
                    ? 'bg-primary text-canvas font-semibold'
                    : 'text-mute hover:text-ink'
                }`}
              >
                JSONPath
              </button>
              <button
                onClick={() => onPathFormatChange('gjson')}
                className={`px-2 py-0.5 rounded-xs font-mono text-[11px] transition-colors ${
                  pathFormat === 'gjson'
                    ? 'bg-primary text-canvas font-semibold'
                    : 'text-mute hover:text-ink'
                }`}
              >
                Gjson
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleExpandAll}
              className="p-1 rounded-sm border border-hairline hover:bg-canvas text-mute hover:text-ink transition-colors"
              title="Expand all"
            >
              <ChevronsUpDown className="w-3.5 h-3.5 text-primary" />
            </button>
            <button
              onClick={handleCollapseAll}
              className="p-1 rounded-sm border border-hairline hover:bg-canvas text-mute hover:text-ink transition-colors"
              title="Collapse all"
            >
              <ChevronsDownUp className="w-3.5 h-3.5 text-mute" />
            </button>

            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-sm border transition-colors ${
                isSearchOpen
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-hairline text-mute hover:text-ink bg-canvas'
              }`}
              title="Search AST (Ctrl+F / Cmd+F)"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Find</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Search Bar Drawer (if opened) */}
      {isSearchOpen && (
        <TreeSearchBar
          query={searchQuery}
          onQueryChange={setSearchQuery}
          scope={searchScope}
          onScopeChange={setSearchScope}
          matchCase={searchMatchCase}
          onMatchCaseChange={setSearchMatchCase}
          useRegex={searchUseRegex}
          onUseRegexChange={setSearchUseRegex}
          matches={searchResult.matches}
          currentIndex={searchCurrentIndex}
          onNavigate={jumpToMatch}
          onClose={() => setIsSearchOpen(false)}
          totalFound={searchResult.totalFound}
          isCapped={searchResult.isCapped}
          pathFormat={pathFormat}
          onSelectMatch={(_, idx) => jumpToMatch(idx)}
        />
      )}

      {/* 3. Main Tree Canvas */}
      <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">
        <TreeNode
          node={ast}
          path={[]}
          expandedPaths={expandedPaths}
          onToggleExpand={toggleExpand}
          onItemSelect={handleItemSelect}
          activePathKey={JSON.stringify(activePath)}
          searchMatches={searchResult.matches}
          searchCurrentIndex={searchCurrentIndex}
        />
      </div>
    </div>
  );
};

interface TreeNodeProps {
  node: ASTNode;
  path: PathSegment[];
  propKey?: string;
  expandedPaths: Set<string>;
  onToggleExpand: (pathKey: string) => void;
  onItemSelect: (path: PathSegment[], e?: React.MouseEvent) => void;
  activePathKey: string;
  searchMatches: SearchMatch[];
  searchCurrentIndex: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  path,
  propKey,
  expandedPaths,
  onToggleExpand,
  onItemSelect,
  activePathKey,
  searchMatches,
  searchCurrentIndex,
}) => {
  const pathKey = JSON.stringify(path);
  const isExpanded = expandedPaths.has(pathKey);
  const isNodeActive = activePathKey === pathKey;

  const isSearchCurrentMatch =
    searchMatches.length > 0 &&
    JSON.stringify(searchMatches[searchCurrentIndex]?.path) === pathKey;

  const domId = `tree-node-${path.join('-')}`;

  if (node.type === 'object') {
    const count = node.children.length;
    return (
      <div id={domId} className="my-0.5">
        <div
          className={`flex items-center gap-1.5 py-0.5 px-1.5 rounded cursor-pointer transition-colors group ${
            isSearchCurrentMatch
              ? 'bg-primary/20 border-l-2 border-primary'
              : isNodeActive
              ? 'bg-canvas-soft border-l-2 border-primary-soft'
              : 'hover:bg-canvas-soft'
          }`}
          onClick={(e) => {
            onToggleExpand(pathKey);
            onItemSelect(path, e);
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(pathKey);
            }}
            className="p-0.5 text-mute hover:text-ink rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-primary" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-mute" />
            )}
          </button>

          {propKey !== undefined && (
            <span
              onClick={(e) => onItemSelect(path, e)}
              className="text-primary font-semibold"
            >
              "{propKey}":
            </span>
          )}

          <span className="text-mute text-[11px]">
            object <span className="text-body font-mono">{`{${count}}`}</span>
          </span>
        </div>

        {isExpanded && (
          <div className="pl-4 ml-1.5 border-l border-hairline/40">
            {node.children.map((prop) => (
              <TreeNode
                key={prop.key}
                node={prop.value}
                path={[...path, prop.key]}
                propKey={prop.key}
                expandedPaths={expandedPaths}
                onToggleExpand={onToggleExpand}
                onItemSelect={onItemSelect}
                activePathKey={activePathKey}
                searchMatches={searchMatches}
                searchCurrentIndex={searchCurrentIndex}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (node.type === 'array') {
    const count = node.children.length;
    return (
      <div id={domId} className="my-0.5">
        <div
          className={`flex items-center gap-1.5 py-0.5 px-1.5 rounded cursor-pointer transition-colors group ${
            isSearchCurrentMatch
              ? 'bg-primary/20 border-l-2 border-primary'
              : isNodeActive
              ? 'bg-canvas-soft border-l-2 border-primary-soft'
              : 'hover:bg-canvas-soft'
          }`}
          onClick={(e) => {
            onToggleExpand(pathKey);
            onItemSelect(path, e);
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(pathKey);
            }}
            className="p-0.5 text-mute hover:text-ink rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-primary" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-mute" />
            )}
          </button>

          {propKey !== undefined && (
            <span
              onClick={(e) => onItemSelect(path, e)}
              className="text-primary font-semibold"
            >
              {typeof propKey === 'number' ? `[${propKey}]` : `"${propKey}":`}
            </span>
          )}

          <span className="text-mute text-[11px]">
            array <span className="text-body font-mono">{`[${count}]`}</span>
          </span>
        </div>

        {isExpanded && (
          <div className="pl-4 ml-1.5 border-l border-hairline/40">
            {node.children.map((item, idx) => (
              <TreeNode
                key={idx}
                node={item}
                path={[...path, idx]}
                propKey={idx.toString()}
                expandedPaths={expandedPaths}
                onToggleExpand={onToggleExpand}
                onItemSelect={onItemSelect}
                activePathKey={activePathKey}
                searchMatches={searchMatches}
                searchCurrentIndex={searchCurrentIndex}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      id={domId}
      onClick={(e) => onItemSelect(path, e)}
      className={`flex items-center gap-2 py-0.5 px-1.5 rounded cursor-pointer transition-colors group ${
        isSearchCurrentMatch
          ? 'bg-primary/20 border-l-2 border-primary'
          : isNodeActive
          ? 'bg-canvas-soft border-l-2 border-primary-soft'
          : 'hover:bg-canvas-soft'
      }`}
    >
      <span className="w-3.5" />
      {propKey !== undefined && (
        <span className="text-primary font-semibold">
          {typeof propKey === 'number' || /^\d+$/.test(propKey) ? `[${propKey}]` : `"${propKey}":`}
        </span>
      )}
      {renderPrimitiveValue(node)}
    </div>
  );
};

function renderPrimitiveValue(node: ASTNode) {
  switch (node.type) {
    case 'string':
      return <span className="text-ink truncate">"{node.value}"</span>;
    case 'number':
      return <span className="text-primary-soft font-mono font-medium">{node.raw}</span>;
    case 'boolean':
      return <span className="text-amber-400 font-mono font-medium">{node.value ? 'true' : 'false'}</span>;
    case 'null':
      return <span className="text-mute font-mono italic">null</span>;
    default:
      return null;
  }
}
