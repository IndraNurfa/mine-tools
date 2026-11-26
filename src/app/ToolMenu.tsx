import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { groupTools, searchTools, type ToolItem } from '../registry.ts';
import { useDialogFocus } from '../components/useDialogFocus.ts';

interface ToolMenuProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
  currentPath: string;
  pinned: string[];
  onTogglePin: (id: string) => void;
  /** Start under the 56px app bar, leaving it usable. */
  belowHeader: boolean;
}

/** Every tool at once, grouped, with search. Opens instantly: it is a keyboard action. */
export const ToolMenu: React.FC<ToolMenuProps> = (props) => (props.open ? <Menu {...props} /> : null);

const Menu: React.FC<ToolMenuProps> = ({ onClose, onNavigate, currentPath, pinned, onTogglePin, belowHeader }) => {
  const dialog = useDialogFocus<HTMLDivElement>(true);
  const list = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  // Pins are listed first only as the menu was opened, so rows don't jump while pinning.
  const [pinnedOnOpen] = useState(pinned);

  /** Sections in on-screen order, each row numbered for arrow-key movement. */
  const { sections, rows } = useMemo(() => {
    const found = searchTools(query);
    const groups = groupTools(found);
    if (!query.trim()) {
      const favourites = pinnedOnOpen.flatMap((id) => found.filter((t) => t.id === id));
      if (favourites.length) groups.unshift({ group: 'Pinned', tools: favourites });
    }
    const rows: ToolItem[] = [];
    const sections = groups.map(({ group, tools }) => ({
      group,
      entries: tools.map((tool) => ({ tool, index: rows.push(tool) - 1 })),
    }));
    return { sections, rows };
  }, [query, pinnedOnOpen]);

  useEffect(() => {
    list.current?.querySelector(`[data-menu-index="${selected}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const pick = (route: string) => {
    onNavigate(route);
    onClose();
  };

  const onSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setSelected((i) => (rows.length ? (i + step + rows.length) % rows.length : 0));
    } else if (e.key === 'Enter' && rows[selected]) {
      e.preventDefault();
      pick(rows[selected].route);
    }
  };

  return (
    <div
      ref={dialog}
      role="dialog"
      aria-label="All tools"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      className={`fixed inset-x-0 bottom-0 z-40 ${belowHeader ? 'top-14' : 'top-0'}`}
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        ref={list}
        className="relative max-h-full overflow-auto bg-canvas border-b border-hairline shadow-modal-stack p-5 pb-8"
      >
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(0);
          }}
          onKeyDown={onSearchKey}
          placeholder="Type a tool name, then press Enter…"
          aria-label="Search all tools"
          autoComplete="off"
          spellCheck={false}
          className="w-full max-w-xl bg-canvas-soft border border-hairline rounded-sm px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-primary"
        />
        <div className="mt-5 columns-2 lg:columns-3 xl:columns-5 gap-6">
          {sections.map(({ group, entries }) => (
            <section key={group} className="break-inside-avoid mb-5">
              <h2 className="px-2 mb-1 text-[11px] font-semibold uppercase tracking-[1.5px] text-mute">{group}</h2>
              {entries.map(({ tool, index }) => {
                const active = tool.route === currentPath;
                const isPinned = pinned.includes(tool.id);
                return (
                  <div key={tool.id} className="group flex items-center">
                    <a
                      href={tool.route}
                      data-menu-index={index}
                      data-instant
                      title={tool.description}
                      aria-current={active ? 'page' : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        pick(tool.route);
                      }}
                      className={`flex-1 min-w-0 flex items-center gap-2.5 px-2 py-1.5 rounded-sm text-sm ${
                        active ? 'bg-primary/15 text-primary' : 'text-body hover:text-ink hover:bg-canvas-soft'
                      } ${index === selected ? 'ring-1 ring-primary/60' : ''}`}
                    >
                      <tool.icon className={`w-4 h-4 shrink-0 ${active ? 'text-primary' : 'text-mute'}`} />
                      <span className="truncate">{tool.name}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => onTogglePin(tool.id)}
                      aria-pressed={isPinned}
                      aria-label={`Pin ${tool.name}`}
                      title={isPinned ? 'Unpin' : 'Pin'}
                      className={`inline-flex items-center justify-center w-7 h-7 shrink-0 rounded-sm ${
                        isPinned
                          ? 'text-primary'
                          : 'text-mute [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:!opacity-100'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${isPinned ? 'fill-primary' : ''}`} />
                    </button>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
        {rows.length === 0 && <p className="text-sm text-mute">No tools match “{query}”.</p>}
      </div>
    </div>
  );
};
