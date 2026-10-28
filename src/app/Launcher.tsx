import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TOOL_REGISTRY, groupTools } from '../registry.ts';
import { Zap, Search, Command } from 'lucide-react';

interface LauncherProps {
  onNavigate: (route: string) => void;
}

export const Launcher: React.FC<LauncherProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus search on mount
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // '/' key focuses search from anywhere on the landing page
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement !== searchRef.current &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter tools by search query
  const filteredTools = useMemo(() => {
    if (!query.trim()) return TOOL_REGISTRY;
    const q = query.toLowerCase();
    return TOOL_REGISTRY.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.group.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q),
    );
  }, [query]);

  const grouped = useMemo(() => groupTools(filteredTools), [filteredTools]);

  // Reset selected index when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keep highlighted card in view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-card-idx="${selectedIndex}"]`);
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Keyboard navigation while search is focused (and global arrows when not typing elsewhere)
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
        onNavigate(filteredTools[selectedIndex].route);
      }
    }
  };

  // Global arrow + enter when focus is not on an input (except our search)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;
      // Search input handles its own keys via onKeyDown
      if (isTyping && target !== searchRef.current) return;
      if (target === searchRef.current) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, Math.max(filteredTools.length - 1, 0)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filteredTools[selectedIndex]) {
        e.preventDefault();
        onNavigate(filteredTools[selectedIndex].route);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [filteredTools, selectedIndex, onNavigate]);

  let flatIdx = 0;

  return (
    <div className="flex h-full w-full flex-col items-center bg-canvas overflow-auto">
      <div className="w-full max-w-2xl px-6 pt-16 pb-12">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-sm bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
            <Zap className="w-5 h-5 fill-primary text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-ink-strong tracking-tight">TOOLBOX</h1>
            <p className="text-xs text-mute -mt-0.5 tracking-wide">DEV UTILITIES</p>
          </div>
        </div>

        {/* Search — focused on load */}
        <div className="relative mb-8">
          <div className="flex items-center gap-2.5 bg-canvas-soft border border-hairline rounded-sm px-4 py-3 focus-within:border-primary transition-colors">
            <Search className="w-4 h-4 text-mute shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search tools…"
              className="bg-transparent text-ink placeholder-mute focus:outline-none w-full text-sm"
              autoComplete="off"
              spellCheck={false}
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-xs bg-canvas border border-hairline text-[10px] text-mute font-mono shrink-0">
              /
            </kbd>
          </div>
        </div>

        {/* Tool Cards grouped by category */}
        <div ref={listRef}>
          {filteredTools.length === 0 ? (
            <div className="text-center py-12 text-mute">
              <p className="text-sm">No tools match &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            grouped.map(({ group, tools }) => (
              <div key={group} className="mb-8 last:mb-0">
                <div className="px-1 mb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-[2.52px] text-mute">
                    {group}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tools.map((tool) => {
                    const Icon = tool.icon;
                    const thisIdx = flatIdx++;
                    const isSelected = thisIdx === selectedIndex;
                    return (
                      <a
                        key={tool.id}
                        href={tool.route}
                        data-card-idx={thisIdx}
                        onClick={(e) => {
                          e.preventDefault();
                          onNavigate(tool.route);
                        }}
                        onMouseEnter={() => setSelectedIndex(thisIdx)}
                        className={`group flex items-start gap-3 p-4 rounded-md border transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-inset-glow'
                            : 'border-hairline bg-canvas hover:border-primary/40'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-sm border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-primary/10 border-primary/40 text-primary'
                              : 'bg-canvas-soft border-hairline text-mute group-hover:text-primary group-hover:border-primary/30'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-ink truncate">{tool.name}</div>
                          <div className="text-xs text-mute mt-0.5 leading-relaxed">
                            {tool.description}
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-center gap-4 mt-8 text-[11px] text-mute font-mono">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded-xs bg-canvas-soft border border-hairline text-[10px] text-ink">
              ↑↓
            </kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded-xs bg-canvas-soft border border-hairline text-[10px] text-ink">
              ↵
            </kbd>
            open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded-xs bg-canvas-soft border border-hairline text-[10px] text-ink flex items-center gap-0.5">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
            jump
          </span>
        </div>
      </div>
    </div>
  );
};
