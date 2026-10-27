import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { TOOL_REGISTRY, ToolItem } from '../registry.ts';
import { Search, CornerDownLeft } from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset and focus when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      // Defer focus so the dialog is in the DOM
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const filteredTools = useMemo(() => {
    if (!query.trim()) return TOOL_REGISTRY;
    const q = query.toLowerCase();
    return TOOL_REGISTRY.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.group.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
    );
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, ToolItem[]>();
    for (const tool of filteredTools) {
      const list = map.get(tool.group) || [];
      list.push(tool);
      map.set(tool.group, list);
    }
    return map;
  }, [filteredTools]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keep highlighted row in view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-palette-idx="${selectedIndex}"]`);
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, open]);

  const openTool = useCallback(
    (route: string) => {
      onNavigate(route);
      onClose();
    },
    [onNavigate, onClose]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, Math.max(filteredTools.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTools[selectedIndex]) {
        openTool(filteredTools[selectedIndex].route);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!open) return null;

  let flatIdx = 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Jump to tool"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-canvas-soft border border-hairline rounded-md shadow-modal-stack overflow-hidden">
        {/* Search row */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-hairline">
          <Search className="w-4 h-4 text-mute shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tools…"
            className="bg-transparent text-ink placeholder-mute focus:outline-none w-full text-sm"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden sm:inline-flex px-1.5 py-0.5 rounded-xs bg-canvas border border-hairline text-[10px] text-mute font-mono shrink-0">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[min(360px,50vh)] overflow-y-auto py-2">
          {filteredTools.length === 0 ? (
            <div className="px-4 py-8 text-center text-mute text-sm">
              No tools match &ldquo;{query}&rdquo;
            </div>
          ) : (
            Array.from(grouped.entries()).map(([group, tools]) => (
              <div key={group} className="mb-1 last:mb-0">
                <div className="px-4 pt-2 pb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[2px] text-mute">
                    {group}
                  </span>
                </div>
                {tools.map((tool) => {
                  const Icon = tool.icon;
                  const thisIdx = flatIdx++;
                  const isSelected = thisIdx === selectedIndex;
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      data-palette-idx={thisIdx}
                      onClick={() => openTool(tool.route)}
                      onMouseEnter={() => setSelectedIndex(thisIdx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isSelected
                          ? 'bg-primary/10 text-ink'
                          : 'text-body hover:bg-canvas hover:text-ink'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-sm border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-primary/15 border-primary/40 text-primary'
                            : 'bg-canvas border-hairline text-mute'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-ink truncate">
                          {tool.name}
                        </div>
                        <div className="text-[11px] text-mute truncate">
                          {tool.description}
                        </div>
                      </div>
                      {isSelected && (
                        <CornerDownLeft className="w-3.5 h-3.5 text-mute shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-hairline text-[11px] text-mute font-mono">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded-xs bg-canvas border border-hairline text-[10px] text-ink">↑↓</kbd>
            move
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded-xs bg-canvas border border-hairline text-[10px] text-ink">↵</kbd>
            open
          </span>
          <span className="flex items-center gap-1 ml-auto">
            <kbd className="px-1 py-0.5 rounded-xs bg-canvas border border-hairline text-[10px] text-ink">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
};
