import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { TOOL_REGISTRY, groupTools } from '../registry.ts';
import { useRouter } from './router.ts';
import { ToastProvider } from '../components/Toast.tsx';
import { CommandPalette } from '../components/CommandPalette.tsx';
import { Launcher } from './Launcher.tsx';
import { Zap, Home, Command, RotateCcw } from 'lucide-react';
import { usePersistentState, clearStored } from '../lib/storage.ts';

const INITIAL_INPUT = `{
  // Welcome to Developer Toolbox
  name: "Toolbox",
  status: "active",
  features: [
    "JSON Formatter & Repair",
    "JSON Path Finder with AST Search",
    "Text & Semantic AST Diff",
  ],
  data: {
    sampleId: 10293,
    losslessBigInt: 987654321098765432109876543210,
    tags: ["utilities", "personal"],
  },
}`;

export const App: React.FC = () => {
  const { currentPath, navigate } = useRouter();
  const [sharedInput, setSharedInput] = usePersistentState<string>('formatter', 'input', INITIAL_INPUT);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [resetNonce, setResetNonce] = useState(0);

  const isHome = currentPath === '/';
  const activeTool = TOOL_REGISTRY.find((t) => t.route === currentPath);

  // Cmd/Ctrl+K opens the jump palette from anywhere
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  // Unknown tool route → land on launcher
  useEffect(() => {
    if (!isHome && !activeTool) {
      navigate('/');
    }
  }, [isHome, activeTool, navigate]);

  return (
    <ToastProvider>
      {isHome || !activeTool ? (
        <div className="h-screen w-screen bg-canvas text-ink overflow-hidden font-sans">
          <Launcher onNavigate={navigate} />
        </div>
      ) : (
        <div className="flex h-screen w-screen bg-canvas text-ink overflow-hidden font-sans select-none">
          {/* Left Sidebar */}
          <aside className="w-64 border-r border-hairline bg-canvas flex flex-col shrink-0 min-h-0">
            <div className="flex-1 min-h-0 flex flex-col">
              {/* Brand Header → home */}
              <div className="h-14 px-4 border-b border-hairline flex items-center bg-canvas">
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/');
                  }}
                  className="flex items-center gap-2.5 group"
                >
                  <div className="w-7 h-7 rounded-sm bg-primary/10 border border-primary/30 flex items-center justify-center text-primary group-hover:border-primary transition-colors">
                    <Zap className="w-4 h-4 fill-primary text-primary" />
                  </div>
                  <div>
                    <span className="font-semibold text-ink text-sm tracking-tight block">
                      TOOLBOX
                    </span>
                    <span className="text-[11px] text-mute block -mt-0.5 tracking-[0.5px]">
                      DEV UTILITIES
                    </span>
                  </div>
                </a>
              </div>

              {/* Tool Navigation — grouped by registry category */}
              <nav className="px-2 pt-3 pb-2 space-y-4 flex-1 min-h-0 overflow-y-auto">
                {groupTools().map(({ group, tools }) => (
                  <div key={group}>
                    <div className="px-3 pb-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-mute">
                        {group}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {tools.map((tool) => {
                        const Icon = tool.icon;
                        const isActive = tool.route === currentPath;
                        return (
                          <a
                            key={tool.id}
                            href={tool.route}
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(tool.route);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-xs font-medium transition-colors text-left group ${
                              isActive
                                ? 'bg-canvas-soft border border-hairline text-primary shadow-inset-glow'
                                : 'text-body hover:text-ink hover:bg-canvas-soft border border-transparent'
                            }`}
                          >
                            <Icon
                              className={`w-4 h-4 ${
                                isActive ? 'text-primary' : 'text-mute group-hover:text-ink'
                              }`}
                            />
                            <div className="truncate flex-1">
                              <div className="truncate">{tool.name}</div>
                            </div>
                            {isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                            )}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </div>

            {/* Sidebar Footer / Keyboard Shortcuts */}
            <div className="p-3 border-t border-hairline bg-canvas space-y-2">
              <div className="text-[11px] uppercase font-semibold tracking-wider text-mute px-1">
                Shortcuts
              </div>
              <div className="font-mono text-[11px] text-mute space-y-1 px-1">
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
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col min-w-0 bg-canvas overflow-hidden">
            {/* Top Header Bar */}
            <header className="h-14 border-b border-hairline bg-canvas px-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/');
                  }}
                  title="Back to launcher"
                  className="flex items-center gap-1.5 text-mute hover:text-ink transition-colors shrink-0"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span className="text-xs hidden sm:inline">Home</span>
                </a>
                <span className="text-hairline">/</span>
                <h1 className="text-sm font-semibold text-ink-strong truncate">
                  {activeTool.name}
                </h1>
                <span className="text-mute text-xs hidden md:inline truncate">
                  — {activeTool.description}
                </span>
              </div>

              {activeTool.resettable && (
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm(`Reset saved data for ${activeTool.name}?`)) return;
                    clearStored(activeTool.id);
                    if (activeTool.id === 'formatter') setSharedInput(INITIAL_INPUT);
                    setResetNonce((n) => n + 1);
                  }}
                  className="mr-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border border-hairline bg-canvas-soft text-mute hover:text-ink hover:border-primary/40 transition-colors text-xs"
                  title="Clear this tool's saved input and settings"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Reset</span>
                </button>
              )}
              <button
                type="button"
                onClick={openPalette}
                className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1.5 rounded-sm border border-hairline bg-canvas-soft text-mute hover:text-ink hover:border-primary/40 transition-colors text-xs"
                title="Jump to tool (⌘K)"
              >
                <SearchHint />
                <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-xs bg-canvas border border-hairline text-[11px] text-ink font-mono">
                  <Command className="w-2.5 h-2.5" />K
                </kbd>
              </button>
            </header>

            {/* Active Tool View */}
            <div className="flex-1 min-h-0 relative">
              <Suspense
                fallback={
                  <div className="flex h-full w-full items-center justify-center text-mute text-xs">
                    Loading tool...
                  </div>
                }
              >
                {(() => {
                  const ToolComponent = activeTool.component;
                  return (
                    <ToolComponent key={`${activeTool.id}:${resetNonce}`} sharedInput={sharedInput} onSharedInputChange={setSharedInput} />
                  );
                })()}
              </Suspense>
            </div>
          </main>
        </div>
      )}

      <CommandPalette open={paletteOpen} onClose={closePalette} onNavigate={navigate} />
    </ToastProvider>
  );
};

/** Small search icon for the header jump button */
function SearchHint() {
  return (
    <span className="flex items-center gap-1.5">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-mute"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <span>Jump to tool</span>
    </span>
  );
}
