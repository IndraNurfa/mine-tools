import React from 'react';
import { AlertTriangle, RotateCcw, RefreshCw } from 'lucide-react';
import { TextBtn } from './ui.tsx';

interface Props {
  toolName: string;
  /** Clear the tool's saved data and remount it. */
  onReset: () => void;
  children: React.ReactNode;
}

/** Keeps one crashing tool from blanking the app. Key it per tool so it recovers on navigation. */
export class ToolErrorBoundary extends React.Component<Props, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div role="alert" className="h-full flex items-center justify-center p-6">
        <div className="max-w-md rounded-md border border-hairline bg-canvas-soft p-6 space-y-3 select-text">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            {this.props.toolName} stopped working
          </h2>
          <p className="font-mono text-xs text-mute break-words">{error.message}</p>
          <p className="text-xs text-body">
            Reload first. If it fails again, reset the tool: this deletes its saved input and settings.
          </p>
          <div className="flex gap-2">
            <TextBtn primary onClick={() => window.location.reload()}>
              <RefreshCw className="w-3.5 h-3.5" /> Reload
            </TextBtn>
            <TextBtn onClick={this.props.onReset}>
              <RotateCcw className="w-3.5 h-3.5" /> Reset this tool
            </TextBtn>
          </div>
        </div>
      </div>
    );
  }
}
