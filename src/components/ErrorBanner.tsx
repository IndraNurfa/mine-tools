import React from 'react';
import { AlertCircle, Wrench, X } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  line?: number;
  column?: number;
  onRepair?: () => void;
  onDismiss?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  line,
  column,
  onRepair,
  onDismiss,
}) => {
  return (
    <div className="bg-canvas-soft border-y border-hairline px-4 py-2.5 flex items-center justify-between gap-4 text-sm">
      <div className="flex items-center gap-3 overflow-hidden">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
        <div className="flex items-center gap-2 truncate">
          <span className="text-ink font-medium truncate">{message}</span>
          {line !== undefined && column !== undefined && (
            <span className="shrink-0 font-mono text-xs text-mute bg-canvas px-2 py-0.5 rounded-xs border border-hairline">
              Ln {line}, Col {column}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onRepair && (
          <button
            onClick={onRepair}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-sm bg-primary text-canvas hover:bg-primary-soft transition-colors"
            title="Attempt to fix missing commas, unclosed brackets, and loose syntax"
          >
            <Wrench className="w-3.5 h-3.5" />
            Smart Repair
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 text-mute hover:text-ink rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
