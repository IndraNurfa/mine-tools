import React from 'react';
import { Zap, Command, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { groupTools } from '../registry.ts';
import { usePersistentState } from '../lib/storage.ts';
import { useMediaQuery } from '../lib/useMediaQuery.ts';

/** Below this width the sidebar starts as an icon rail, until the user chooses. */
const NARROW = '(max-width: 1279px)';

export const Sidebar: React.FC<{ currentPath: string; onNavigate: (route: string) => void }> = ({
  currentPath,
  onNavigate,
}) => {
  const narrow = useMediaQuery(NARROW);
  // null = follow the window width
  const [choice, setChoice] = usePersistentState<boolean | null>(
    'shell',
    'sidebarCollapsed',
    null,
    (v) => v === null || typeof v === 'boolean',
  );
  const collapsed = choice ?? narrow;
  const toggleLabel = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  const go = (route: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate(route);
  };

  return (
    <aside className={`${collapsed ? 'w-14' : 'w-64'} border-r border-hairline bg-canvas flex flex-col shrink-0 min-h-0`}>
      {/* Brand Header → home */}
      <div className={`h-14 border-b border-hairline flex items-center shrink-0 ${collapsed ? 'justify-center' : 'px-4'}`}>
        <a href="/" onClick={go('/')} title="Back to launcher" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-sm bg-primary/10 border border-primary/30 flex items-center justify-center text-primary group-hover:border-primary transition-colors">
            <Zap className="w-4 h-4 fill-primary text-primary" />
          </div>
          <div className={collapsed ? 'sr-only' : ''}>
            <span className="font-semibold text-ink text-sm tracking-tight block">TOOLBOX</span>
            <span className="text-[11px] text-mute block -mt-0.5 tracking-[0.5px]">DEV UTILITIES</span>
          </div>
        </a>
      </div>

      {/* Tool Navigation — grouped by registry category */}
      <nav className="px-2 pt-3 pb-2 space-y-4 flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {groupTools().map(({ group, tools }, i) => (
          <div key={group} className={collapsed && i > 0 ? 'pt-3 border-t border-hairline' : ''}>
            <div className={collapsed ? 'sr-only' : 'px-3 pb-1.5'}>
              <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-mute">{group}</span>
            </div>
            <div className="space-y-1">
              {tools.map((tool) => {
                const Icon = tool.icon;
                const isActive = tool.route === currentPath;
                return (
                  <a
                    key={tool.id}
                    href={tool.route}
                    onClick={go(tool.route)}
                    title={collapsed ? tool.name : undefined}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full flex items-center gap-3 py-2 rounded-sm text-xs font-medium transition-colors text-left group ${
                      collapsed ? 'justify-center' : 'px-3'
                    } ${
                      isActive
                        ? 'bg-canvas-soft border border-hairline text-primary shadow-inset-glow'
                        : 'text-body hover:text-ink hover:bg-canvas-soft border border-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-mute group-hover:text-ink'}`}
                    />
                    <div className={collapsed ? 'sr-only' : 'truncate flex-1'}>{tool.name}</div>
                    {isActive && !collapsed && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer: shortcuts and collapse toggle */}
      <div className="p-2 border-t border-hairline space-y-2 shrink-0">
        {!collapsed && (
          <div className="px-2 pt-1 space-y-2">
            <div className="text-[11px] uppercase font-semibold tracking-wider text-mute">Shortcuts</div>
            <div className="font-mono text-[11px] text-mute space-y-1">
              <div className="flex justify-between items-center">
                <span>Jump to tool</span>
                <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-xs bg-canvas-soft border border-hairline text-[11px] text-ink">
                  <Command className="w-2.5 h-2.5" />K
                </kbd>
              </div>
              <div className="flex justify-between items-center">
                <span>Find in AST</span>
                <kbd className="px-1.5 py-0.5 rounded-xs bg-canvas-soft border border-hairline text-[11px] text-ink">
                  Ctrl+F
                </kbd>
              </div>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setChoice(!collapsed)}
          title={toggleLabel}
          aria-label={toggleLabel}
          aria-expanded={!collapsed}
          className={`w-full flex items-center gap-3 py-2 rounded-sm text-xs text-mute hover:text-ink hover:bg-canvas-soft transition-colors ${
            collapsed ? 'justify-center' : 'px-3'
          }`}
        >
          <ToggleIcon className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
};
