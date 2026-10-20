import React from 'react';
import { Wrench, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { RepairItem } from '../core/repair/repair.ts';

interface RepairModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: RepairItem[];
  hasTruncation: boolean;
  onApply: () => void;
}

export const RepairModal: React.FC<RepairModalProps> = ({
  isOpen,
  onClose,
  report,
  hasTruncation,
  onApply,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-canvas border border-hairline rounded-md shadow-modal-stack w-full max-w-xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-hairline flex items-center justify-between bg-canvas-soft">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">Smart Repair Report</h3>
              <p className="text-xs text-mute">
                {report.length} automatic {report.length === 1 ? 'fix' : 'fixes'} identified
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-mute hover:text-ink rounded-sm transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Truncation Alert */}
        {hasTruncation && (
          <div className="bg-amber-950/40 border-b border-amber-600/30 px-5 py-3 flex items-start gap-3 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300 font-semibold block">
                Warning: Truncated Payload Detected
              </strong>
              <span className="text-amber-200/80">
                The JSON payload ended abruptly. Unclosed brackets or strings were completed, but the last value may be incomplete (e.g. cut-off IDs or amounts). Verify critical fields carefully.
              </span>
            </div>
          </div>
        )}

        {/* Fixes List */}
        <div className="flex-1 overflow-y-auto p-5 divide-y divide-hairline/40">
          {report.map((item, idx) => (
            <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-start gap-3 text-xs">
              {item.severity === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="text-ink font-medium">{item.message}</p>
                <span className="font-mono text-[11px] text-mute">
                  Line {item.line}, Column {item.column}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-hairline bg-canvas-soft flex items-center justify-between">
          <span className="text-xs text-mute font-mono">
            {hasTruncation ? '⚠️ Repaired with warnings' : '✓ Strict JSON guaranteed'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-sm border border-hairline text-ink text-xs hover:bg-canvas transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onApply();
                onClose();
              }}
              className="px-3.5 py-1.5 rounded-sm bg-primary hover:bg-primary-soft text-canvas font-semibold text-xs transition-colors flex items-center gap-1.5"
            >
              <Wrench className="w-3.5 h-3.5" />
              Apply Repaired JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
