import React, { useState } from 'react';
import { TOOL_REGISTRY } from '../registry.ts';
import { useRouter } from './router.ts';
import { ToastProvider } from '../components/Toast.tsx';
import { Zap } from 'lucide-react';

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
  const [sharedInput, setSharedInput] = useState<string>(INITIAL_INPUT);

  const activeTool = TOOL_REGISTRY.find((t) => t.path === currentPath) || TOOL_REGISTRY[0];
  const ToolComponent = activeTool.component;

  return (
    <ToastProvider>
      <div className="flex h-screen w-screen bg-canvas text-ink overflow-hidden font-sans select-none">
        {/* Left Sidebar */}
        <aside className="w-64 border-r border-hairline bg-canvas flex flex-col justify-between shrink-0">
          <div>
            {/* Brand Header */}
            <div className="h-14 px-4 border-b border-hairline flex items-center bg-canvas">
              <a
                href="/formatter"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/formatter');
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
                  <span className="text-[10px] text-mute block -mt-0.5 tracking-[0.5px]">
                    DEV UTILITIES
                  </span>
                </div>
              </a>
            </div>

            {/* Section Eyebrow */}
            <div className="px-4 pt-4 pb-2">
              <span className="text-[10px] font-semibold uppercase tracking-[2.52px] text-mute">
                MODULES
              </span>
            </div>

            {/* Tool Navigation Menu with real links */}
            <nav className="px-2 space-y-1">
              {TOOL_REGISTRY.map((tool) => {
                const Icon = tool.icon;
                const isActive = tool.path === currentPath;
                return (
                  <a
                    key={tool.id}
                    href={tool.path}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(tool.path);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-xs font-medium transition-colors text-left group ${
                      isActive
                        ? 'bg-canvas-soft border border-hairline text-primary shadow-inset-glow'
                        : 'text-body hover:text-ink hover:bg-canvas-soft border border-transparent'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-mute group-hover:text-ink'}`} />
                    <div className="truncate flex-1">
                      <div className="truncate">{tool.name}</div>
                    </div>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </a>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer / Keyboard Shortcuts */}
          <div className="p-3 border-t border-hairline bg-canvas space-y-2">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-mute px-1">
              Shortcuts
            </div>
            <div className="font-mono text-[11px] text-mute space-y-1 px-1">
              <div className="flex justify-between items-center">
                <span>Find in AST</span>
                <kbd className="px-1.5 py-0.5 rounded-xs bg-canvas-soft border border-hairline text-[10px] text-ink">
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
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-semibold text-ink-strong">
                {activeTool.name}
              </h1>
              <span className="text-mute text-xs hidden md:inline">
                — {activeTool.description}
              </span>
            </div>
          </header>

          {/* Active Tool View */}
          <div className="flex-1 min-h-0 relative">
            <ToolComponent
              sharedInput={sharedInput}
              onSharedInputChange={setSharedInput}
            />
          </div>
        </main>
      </div>
    </ToastProvider>
  );
};
