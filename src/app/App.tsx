import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { TOOL_REGISTRY } from '../registry.ts';
import { useRouter } from './router.ts';
import { ToastProvider } from '../components/Toast.tsx';
import { Launcher } from './Launcher.tsx';
import { AppHeader } from './AppHeader.tsx';
import { ToolMenu } from './ToolMenu.tsx';
import { ToolErrorBoundary } from '../components/ToolErrorBoundary.tsx';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [pinned, setPinned] = usePersistentState<string[]>('shell', 'pinnedTools', ['formatter', 'diff', 'jwt']);
  const [resetNonce, setResetNonce] = useState(0);

  const isHome = currentPath === '/';
  const activeTool = TOOL_REGISTRY.find((t) => t.route === currentPath);

  const resetTool = (id: string) => {
    clearStored(id);
    if (id === 'formatter') setSharedInput(INITIAL_INPUT);
    setResetNonce((n) => n + 1);
  };

  // Cmd/Ctrl+K opens the tool menu from anywhere
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setMenuOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const toggleMenu = useCallback(() => setMenuOpen((open) => !open), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const togglePin = (id: string) =>
    setPinned((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  // Going anywhere (a pinned tool, Home, browser back) closes the menu.
  useEffect(() => setMenuOpen(false), [currentPath]);

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
        <div className="flex flex-col h-screen w-screen bg-canvas text-ink overflow-hidden font-sans select-none">
          <AppHeader
            tool={activeTool}
            pinned={pinned}
            menuOpen={menuOpen}
            onToggleMenu={toggleMenu}
            onNavigate={navigate}
            onReset={() => {
              if (!window.confirm(`Reset saved data for ${activeTool.name}?`)) return;
              resetTool(activeTool.id);
            }}
          />

          <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
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

      <ToolMenu
        open={menuOpen}
        onClose={closeMenu}
        onNavigate={navigate}
        currentPath={currentPath}
        pinned={pinned}
        onTogglePin={togglePin}
        belowHeader={!isHome && Boolean(activeTool)}
      />
    </ToastProvider>
  );
};
