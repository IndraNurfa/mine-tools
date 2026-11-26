import React from 'react';
import { ChevronDown, RotateCcw, Search, Zap } from 'lucide-react';
import { TOOL_REGISTRY, type ToolItem } from '../registry.ts';
import { TextBtn } from '../components/ui.tsx';
import { shortcut } from '../lib/platform.ts';

interface AppHeaderProps {
  tool: ToolItem;
  pinned: string[];
  menuOpen: boolean;
  onToggleMenu: () => void;
  onNavigate: (route: string) => void;
  onReset: () => void;
}

/** The only app chrome: home, tool switcher, pinned tools, reset and search. */
export const AppHeader: React.FC<AppHeaderProps> = ({
  tool,
  pinned,
  menuOpen,
  onToggleMenu,
  onNavigate,
  onReset,
}) => {
  const Icon = tool.icon;
  const go = (route: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate(route);
  };

  return (
    <header className="relative z-50 h-14 shrink-0 border-b border-hairline bg-canvas px-3 flex items-center gap-2">
      <a
        href="/"
        onClick={go('/')}
        title="Home"
        aria-label="Home"
        className="shrink-0 w-8 h-8 rounded-sm bg-primary text-canvas hover:bg-primary-soft flex items-center justify-center"
      >
        <Zap className="w-4 h-4 fill-canvas" />
      </a>

      <h1 className="shrink-0">
        <button
          type="button"
          onClick={onToggleMenu}
          aria-expanded={menuOpen}
          title={tool.description}
          className="inline-flex items-center gap-2 h-10 px-2.5 rounded-md hover:bg-canvas-soft"
        >
          <Icon className="w-4 h-4 text-primary" />
          <span className="text-lg font-semibold text-ink-strong whitespace-nowrap">{tool.name}</span>
          <ChevronDown className="w-4 h-4 text-mute" />
        </button>
      </h1>

      <nav
        aria-label="Pinned tools"
        className="hidden lg:flex flex-1 min-w-0 items-center gap-1 overflow-x-auto border-l border-hairline pl-3"
      >
        {pinned
          .flatMap((id) => TOOL_REGISTRY.filter((t) => t.id === id))
          .map((t) => (
            <a
              key={t.id}
              href={t.route}
              onClick={go(t.route)}
              aria-current={t.id === tool.id ? 'page' : undefined}
              className={`shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-pill border text-xs transition-colors ${
                t.id === tool.id
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-hairline text-mute hover:text-ink'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.name}
            </a>
          ))}
      </nav>

      <div className="ml-auto flex items-center gap-2 shrink-0">
        {tool.resettable && (
          <TextBtn danger onClick={onReset} title="Clear this tool's saved input and settings" aria-label="Reset">
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reset</span>
          </TextBtn>
        )}
        <button
          type="button"
          onClick={onToggleMenu}
          aria-label="All tools"
          title={`All tools (${shortcut('K')})`}
          className="inline-flex items-center gap-2 h-9 md:w-44 px-3 rounded-sm border border-hairline bg-canvas-soft text-sm text-mute hover:text-ink hover:border-primary/40"
        >
          <Search className="w-4 h-4" />
          <span className="hidden md:inline flex-1 text-left">All tools</span>
          <kbd className="font-mono text-[11px]">{shortcut('K')}</kbd>
        </button>
      </div>
    </header>
  );
};
