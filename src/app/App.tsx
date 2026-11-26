import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { TOOL_REGISTRY } from '../registry.ts';
import { useRouter } from './router.ts';
import { ToastProvider } from '../components/Toast.tsx';
import { CommandPalette } from '../components/CommandPalette.tsx';
import { Launcher } from './Launcher.tsx';
import { Sidebar } from './Sidebar.tsx';
import { ToolErrorBoundary } from '../components/ToolErrorBoundary.tsx';
import { Home, Command, RotateCcw } from 'lucide-react';
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

  const resetTool = (id: string) => {
    clearStored(id);
    if (id === 'formatter') setSharedInput(INITIAL_INPUT);
    setResetNonce((n) => n + 1);
  };

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
          <Sidebar currentPath={currentPath} onNavigate={navigate} />

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col min-w-0 bg-canvas overflow-hidden">
            {/* Top Header Bar */}
            <header className="h-14 border-b border-hairline bg-canvas px-4 lg:px-6 flex items-center justify-between gap-3 shrink-0">
              <div className="flex flex-1 items-center gap-3 min-w-0">
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
                <h1 className="text-sm font-semibold text-ink-strong whitespace-nowrap">
                  {activeTool.name}
                </h1>
                <span className="text-mute text-xs hidden lg:inline truncate min-w-0">
                  — {activeTool.description}
                </span>
              </div>

              {activeTool.resettable && (
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm(`Reset saved data for ${activeTool.name}?`)) return;
                    resetTool(activeTool.id);
                  }}
                  className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border border-hairline bg-canvas-soft text-mute hover:text-ink hover:border-primary/40 transition-colors text-xs"
                  title="Clear this tool's saved input and settings"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Reset</span>
                </button>
              )}
              <button
                type="button"
                onClick={openPalette}
                className="shrink-0 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-sm border border-hairline bg-canvas-soft text-mute hover:text-ink hover:border-primary/40 transition-colors text-xs"
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
              <ToolErrorBoundary
                key={`${activeTool.id}:${resetNonce}`}
                toolName={activeTool.name}
                onReset={() => {
                  if (!window.confirm(`Delete saved data for ${activeTool.name}?`)) return;
                  resetTool(activeTool.id);
                }}
              >
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
                      <ToolComponent sharedInput={sharedInput} onSharedInputChange={setSharedInput} />
                    );
                  })()}
                </Suspense>
              </ToolErrorBoundary>
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
      <span className="hidden lg:inline whitespace-nowrap">Jump to tool</span>
    </span>
  );
}
