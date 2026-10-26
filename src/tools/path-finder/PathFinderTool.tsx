import React, { useState, useEffect, useMemo } from 'react';
import { Editor } from '../../components/Editor.tsx';
import { TreeView } from '../../components/TreeView.tsx';
import { ErrorBanner } from '../../components/ErrorBanner.tsx';
import { RepairModal } from '../../components/RepairModal.tsx';
import { useToast } from '../../components/Toast.tsx';
import { parseLooseJSON } from '../../core/parse/parser.ts';
import { ASTNode, ParseError } from '../../core/parse/types.ts';
import { formatAST, calculateSizeMetrics } from '../../core/format/formatter.ts';
import { repairAndParseJSON, RepairItem } from '../../core/repair/repair.ts';
import {
  Trash2,
  ClipboardPaste,
  Wrench,
  Sparkles,
  FileCode,
  FolderTree,
  Route,
} from 'lucide-react';

const SAMPLE_JSON = `{
  // Sample Loose JSON — click a key or value to copy its path
  user: {
    name: "Ada Lovelace",
    email: 'ada@example.com',
    roles: ["admin", "editor"],
    address: [
      { city: "London", zip: "SW1A 1AA" },
      { city: "Bath", zip: "BA1 1AA" },
    ],
  },
  metrics: {
    logins: 42,
    bigId: 98765432101234567890,
    active: true,
  },
  'special.dotted.key': null,
}`;

interface PathFinderToolProps {
  sharedInput?: string;
  onSharedInputChange?: (val: string) => void;
}

export const PathFinderTool: React.FC<PathFinderToolProps> = ({
  sharedInput,
  onSharedInputChange,
}) => {
  const { showToast } = useToast();

  // Local input state (PathFinder uses its own input, not shared)
  const [input, setInput] = useState<string>(sharedInput || SAMPLE_JSON);

  const [ast, setAst] = useState<ASTNode | null>(null);
  const [parseError, setParseError] = useState<{
    message: string;
    line: number;
    column: number;
  } | null>(null);

  // Repair Modal state
  const [isRepairModalOpen, setIsRepairModalOpen] = useState(false);
  const [repairReport, setRepairReport] = useState<RepairItem[]>([]);
  const [hasTruncation, setHasTruncation] = useState(false);
  const [pendingRepairedText, setPendingRepairedText] = useState('');

  // Parse whenever input changes
  useEffect(() => {
    if (!input.trim()) {
      setAst(null);
      setParseError(null);
      return;
    }

    try {
      const parsedAst = parseLooseJSON(input);
      setAst(parsedAst);
      setParseError(null);
    } catch (err: any) {
      setAst(null);
      if (err instanceof ParseError) {
        setParseError({
          message: err.message,
          line: err.line,
          column: err.column,
        });
      } else {
        setParseError({
          message: err.message || 'Syntax error',
          line: 1,
          column: 1,
        });
      }
    }
  }, [input]);

  const sizeMetrics = useMemo(() => {
    return calculateSizeMetrics(input, '');
  }, [input]);

  const handleSmartRepair = () => {
    try {
      const result = repairAndParseJSON(input || '{}');
      const formatted = formatAST(result.ast, { indent: '2' });
      setRepairReport(result.report);
      setHasTruncation(result.hasTruncation);
      setPendingRepairedText(formatted);
      setIsRepairModalOpen(true);
    } catch (err: any) {
      showToast(
        'Repair failed: Ambiguous input could not be resolved safely',
        { type: 'error' }
      );
    }
  };

  const handleApplyRepair = () => {
    if (pendingRepairedText) {
      setInput(pendingRepairedText);
      showToast('Applied repaired JSON', { type: 'success' });
    }
  };

  const handlePasteInput = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text);
      showToast('Pasted from clipboard');
    } catch {
      showToast('Clipboard access denied', { type: 'error' });
    }
  };

  const handleClear = () => {
    setInput('');
    showToast('Input cleared');
  };

  const handleLoadSample = () => {
    setInput(SAMPLE_JSON);
    showToast('Loaded sample JSON');
  };

  return (
    <div className="flex flex-col h-full w-full bg-canvas overflow-hidden">
      {parseError && (
        <ErrorBanner
          message={parseError.message}
          line={parseError.line}
          column={parseError.column}
          onRepair={handleSmartRepair}
          onDismiss={() => setParseError(null)}
        />
      )}

      {/* Split view: Left Input, Right Tree */}
      <div className="flex-1 flex min-h-0 divide-x divide-hairline">
        {/* Left Pane: Input */}
        <div className="w-1/2 flex flex-col min-w-0 bg-canvas">
          <div className="h-10 border-b border-hairline bg-canvas-soft px-3 flex items-center justify-between gap-2 text-xs shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-primary" />
                Input
              </span>
              <span className="text-[10px] text-mute font-mono bg-canvas px-1.5 py-0.5 rounded-xs border border-hairline">
                {sizeMetrics.inputFormatted}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleLoadSample}
                className="px-2 py-1 rounded-sm border border-hairline hover:bg-canvas text-mute hover:text-ink text-xs transition-colors flex items-center gap-1"
                title="Load sample loose JSON"
              >
                <Sparkles className="w-3 h-3 text-primary" />
                <span>Sample</span>
              </button>
              <button
                onClick={handlePasteInput}
                className="px-2 py-1 rounded-sm border border-hairline hover:bg-canvas text-mute hover:text-ink text-xs transition-colors flex items-center gap-1"
                title="Paste from clipboard"
              >
                <ClipboardPaste className="w-3 h-3" />
                <span>Paste</span>
              </button>
              <button
                onClick={handleSmartRepair}
                className="flex items-center gap-1 px-2 py-1 rounded-sm border border-hairline hover:border-primary text-ink hover:text-primary bg-canvas text-xs transition-colors"
                title="Smart format / Repair broken JSON"
              >
                <Wrench className="w-3 h-3 text-primary" />
                <span>Repair</span>
              </button>
              <button
                onClick={handleClear}
                className="px-2 py-1 rounded-sm border border-hairline hover:bg-canvas text-mute hover:text-red-400 text-xs transition-colors flex items-center gap-1"
                title="Clear input"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          <div className="flex-1 relative">
            <Editor
              value={input}
              onChange={setInput}
              language="json"
              errorLocation={parseError}
            />
          </div>
        </div>

        {/* Right Pane: Path Finder Tree */}
        <div className="w-1/2 flex flex-col min-w-0 bg-canvas">
          <div className="flex-1 relative flex flex-col min-h-0">
            {ast ? (
              <TreeView
                ast={ast}
                mode="pathfinder"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-mute p-6 text-center">
                <Route className="w-12 h-12 stroke-[1.2] mb-3 text-hairline" />
                <p className="text-sm font-semibold text-ink">
                  Paste JSON to explore paths
                </p>
                <p className="text-xs text-mute mt-1">
                  Click any key or value in the tree to copy its path instantly.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <RepairModal
        isOpen={isRepairModalOpen}
        onClose={() => setIsRepairModalOpen(false)}
        report={repairReport}
        hasTruncation={hasTruncation}
        onApply={handleApplyRepair}
      />
    </div>
  );
};

export default PathFinderTool;
