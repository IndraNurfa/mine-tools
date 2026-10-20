import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, ChevronUp, X, List, SlidersHorizontal, Check } from 'lucide-react';
import { SearchScope, SearchMatch } from '../core/search/search.ts';
import { PathFormat, formatPath } from '../core/path/format.ts';

interface TreeSearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  scope: SearchScope;
  onScopeChange: (scope: SearchScope) => void;
  matchCase: boolean;
  onMatchCaseChange: (val: boolean) => void;
  useRegex: boolean;
  onUseRegexChange: (val: boolean) => void;
  matches: SearchMatch[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
  totalFound: number;
  isCapped: boolean;
  pathFormat: PathFormat;
  onSelectMatch: (match: SearchMatch, index: number) => void;
}

export const TreeSearchBar: React.FC<TreeSearchBarProps> = ({
  query,
  onQueryChange,
  scope,
  onScopeChange,
  matchCase,
  onMatchCaseChange,
  useRegex,
  onUseRegexChange,
  matches,
  currentIndex,
  onNavigate,
  onClose,
  totalFound,
  isCapped,
  pathFormat,
  onSelectMatch,
}) => {
  const [showMatchesList, setShowMatchesList] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      if (matches.length === 0) return;
      if (e.shiftKey) {
        // Prev
        const nextIdx = (currentIndex - 1 + matches.length) % matches.length;
        onNavigate(nextIdx);
      } else {
        // Next
        const nextIdx = (currentIndex + 1) % matches.length;
        onNavigate(nextIdx);
      }
    }
  };

  return (
    <div className="relative border-b border-hairline bg-canvas-soft px-3 py-2 flex flex-wrap items-center gap-2 text-xs">
      {/* Search Input Box */}
      <div className="flex items-center gap-2 bg-canvas border border-hairline rounded-sm px-2.5 py-1.5 focus-within:border-primary transition-colors flex-1 min-w-[200px]">
        <Search className="w-3.5 h-3.5 text-mute shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search in AST (Ctrl+F / Cmd+F)..."
          className="bg-transparent text-ink placeholder-mute focus:outline-none w-full text-xs font-mono"
        />
        {query && (
          <button
            onClick={() => onQueryChange('')}
            className="text-mute hover:text-ink p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Match count */}
      <div className="font-mono text-xs text-mute px-2 shrink-0">
        {totalFound === 0 ? (
          query ? 'No matches' : ''
        ) : (
          <span>
            <strong className="text-primary">{currentIndex + 1}</strong> of{' '}
            {isCapped ? '1000+ matches' : totalFound}
          </span>
        )}
      </div>

      {/* Prev / Next controls */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => {
            if (matches.length > 0) {
              const nextIdx = (currentIndex - 1 + matches.length) % matches.length;
              onNavigate(nextIdx);
            }
          }}
          disabled={matches.length === 0}
          title="Previous match (Shift+Enter)"
          className="p-1 text-mute hover:text-ink disabled:opacity-40 rounded border border-hairline hover:bg-canvas transition-colors"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            if (matches.length > 0) {
              const nextIdx = (currentIndex + 1) % matches.length;
              onNavigate(nextIdx);
            }
          }}
          disabled={matches.length === 0}
          title="Next match (Enter)"
          className="p-1 text-mute hover:text-ink disabled:opacity-40 rounded border border-hairline hover:bg-canvas transition-colors"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scope toggle (keys, values, both) */}
      <div className="flex items-center bg-canvas border border-hairline rounded-sm p-0.5 shrink-0">
        <button
          onClick={() => onScopeChange('both')}
          className={`px-2 py-0.5 rounded-xs transition-colors ${
            scope === 'both' ? 'bg-primary text-canvas font-semibold' : 'text-mute hover:text-ink'
          }`}
        >
          Both
        </button>
        <button
          onClick={() => onScopeChange('keys')}
          className={`px-2 py-0.5 rounded-xs transition-colors ${
            scope === 'keys' ? 'bg-primary text-canvas font-semibold' : 'text-mute hover:text-ink'
          }`}
        >
          Keys
        </button>
        <button
          onClick={() => onScopeChange('values')}
          className={`px-2 py-0.5 rounded-xs transition-colors ${
            scope === 'values' ? 'bg-primary text-canvas font-semibold' : 'text-mute hover:text-ink'
          }`}
        >
          Values
        </button>
      </div>

      {/* Toggles: Case, Regex */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onMatchCaseChange(!matchCase)}
          className={`px-2 py-1 rounded-sm border font-mono text-[11px] transition-colors ${
            matchCase
              ? 'border-primary bg-primary/10 text-primary font-bold'
              : 'border-hairline text-mute hover:text-ink bg-canvas'
          }`}
          title="Match Case"
        >
          Aa
        </button>
        <button
          onClick={() => onUseRegexChange(!useRegex)}
          className={`px-2 py-1 rounded-sm border font-mono text-[11px] transition-colors ${
            useRegex
              ? 'border-primary bg-primary/10 text-primary font-bold'
              : 'border-hairline text-mute hover:text-ink bg-canvas'
          }`}
          title="Use Regular Expression"
        >
          .*
        </button>
      </div>

      {/* Matches list button */}
      <button
        onClick={() => setShowMatchesList(!showMatchesList)}
        disabled={matches.length === 0}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-sm border transition-colors shrink-0 ${
          showMatchesList
            ? 'border-primary text-primary bg-canvas'
            : 'border-hairline text-mute hover:text-ink bg-canvas disabled:opacity-40'
        }`}
        title="View all matched paths"
      >
        <List className="w-3.5 h-3.5" />
        <span>List ({matches.length})</span>
      </button>

      {/* Close search button */}
      <button
        onClick={onClose}
        className="p-1 text-mute hover:text-ink rounded transition-colors ml-auto"
        title="Close find (Esc)"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Matches List Dropdown Drawer */}
      {showMatchesList && matches.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-40 bg-canvas border-b border-hairline shadow-modal-stack max-h-60 overflow-y-auto">
          <div className="px-3 py-2 border-b border-hairline/50 text-[11px] text-mute flex justify-between items-center bg-canvas-soft">
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              Found {isCapped ? '1000+' : matches.length} matches — Click any path to jump
            </span>
            <button
              onClick={() => setShowMatchesList(false)}
              className="text-mute hover:text-ink text-xs"
            >
              Close
            </button>
          </div>
          <div className="divide-y divide-hairline/30 font-mono text-xs">
            {matches.map((m, idx) => {
              const formatted = formatPath(m.path, pathFormat);
              const isSelected = idx === currentIndex;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    onSelectMatch(m, idx);
                    setShowMatchesList(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between gap-4 hover:bg-canvas-soft transition-colors ${
                    isSelected ? 'bg-canvas-soft border-l-2 border-primary text-primary' : 'text-ink'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-[10px] uppercase font-semibold text-mute px-1.5 py-0.5 rounded-xs bg-canvas border border-hairline">
                      {m.target}
                    </span>
                    <span className="font-medium truncate">{formatted || '<root>'}</span>
                  </div>
                  <span className="text-mute text-[11px] truncate max-w-[200px] shrink-0">
                    "{m.text}"
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
