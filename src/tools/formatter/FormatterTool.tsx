import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Editor } from '../../components/Editor.tsx';
import { TreeView } from '../../components/TreeView.tsx';
import { ErrorBanner } from '../../components/ErrorBanner.tsx';
import { RepairModal } from '../../components/RepairModal.tsx';
import { useToast } from '../../components/Toast.tsx';
import { parseLooseJSON } from '../../core/parse/parser.ts';
import { ASTNode, ParseError } from '../../core/parse/types.ts';
import { formatAST, IndentOption, calculateSizeMetrics } from '../../core/format/formatter.ts';
import { repairAndParseJSON, RepairItem } from '../../core/repair/repair.ts';
import {
  Copy,
  Trash2,
  ClipboardPaste,
  Wrench,
  ChevronsUpDown,
  ChevronsDownUp,
  Sparkles,
  ArrowRight,
  FileCode,
  FolderTree,
} from 'lucide-react';

const SAMPLE_JSON = `{
  // Sample Loose JSON
  id: "item_98231",
  name: "Developer Toolbox",
  version: 1.0,
  settings: {
    minify: false,
    tabSize: 2,
    trailingCommas: [1, 2, 3,],
  },
  metrics: {
    latencyMs: 14.2,
    bigInteger: 123456789012345678901234567890,
  },
  'special.key': {
    "nested key with spaces": true,
  },
}`;

interface FormatterToolProps {
  sharedInput: string;
  onSharedInputChange: (val: string) => void;
}

export const FormatterTool: React.FC<FormatterToolProps> = ({
  sharedInput,
  onSharedInputChange,
}) => {
  const { showToast } = useToast();

  // Preview Switch: Text | Tree
  const [outputView, setOutputView] = useState<'text' | 'tree'>('text');

  // Formatter options
  const [indent, setIndent] = useState<IndentOption>('2');
  const [sortKeys, setSortKeys] = useState(false);

  const [ast, setAst] = useState<ASTNode | null>(null);
  const [formattedOutput, setFormattedOutput] = useState<string>('');
  const [parseError, setParseError] = useState<{ message: string; line: number; column: number } | null>(null);

  // Repair Modal state
  const [isRepairModalOpen, setIsRepairModalOpen] = useState(false);
  const [repairReport, setRepairReport] = useState<RepairItem[]>([]);
  const [hasTruncation, setHasTruncation] = useState(false);
  const [pendingRepairedText, setPendingRepairedText] = useState('');

  const outputEditorRef = useRef<any>(null);

  // Parse and format whenever input changes
  useEffect(() => {
    if (!sharedInput.trim()) {
      setAst(null);
      setFormattedOutput('');
      setParseError(null);
      return;
    }

    try {
      const parsedAst = parseLooseJSON(sharedInput);
      setAst(parsedAst);
      setParseError(null);

      const formatted = formatAST(parsedAst, { indent, sortKeys });
      setFormattedOutput(formatted);
    } catch (err: any) {
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
  }, [sharedInput, indent, sortKeys]);

  const handleSmartRepair = () => {
    try {
      const result = repairAndParseJSON(sharedInput || '{}');
      const formatted = formatAST(result.ast, { indent, sortKeys });
      setRepairReport(result.report);
      setHasTruncation(result.hasTruncation);
      setPendingRepairedText(formatted);
      setIsRepairModalOpen(true);
    } catch (err: any) {
      showToast('Repair failed: Ambiguous input could not be resolved safely', { type: 'error' });
    }
  };

  const handleApplyRepair = () => {
    if (pendingRepairedText) {
      onSharedInputChange(pendingRepairedText);
      showToast('Applied repaired JSON', { type: 'success' });
    }
  };

  const sizeMetrics = useMemo(() => {
    return calculateSizeMetrics(sharedInput, formattedOutput);
  }, [sharedInput, formattedOutput]);

  const handleCopyOutput = () => {
    if (!formattedOutput) return;
    navigator.clipboard.writeText(formattedOutput);
    showToast('Strict JSON copied to clipboard');
  };

  const handlePasteInput = async () => {
    try {
      const text = await navigator.clipboard.readText();
      onSharedInputChange(text);
      showToast('Pasted from clipboard');
    } catch {
      showToast('Clipboard access denied', { type: 'error' });
    }
  };

  const handleClear = () => {
    onSharedInputChange('');
    showToast('Input cleared');
  };

  const handleLoadSample = () => {
    onSharedInputChange(SAMPLE_JSON);
    showToast('Loaded sample JSON');
  };

  // Consistent Expand All / Collapse All for Text view
  const handleUnfoldAll = () => {
    outputEditorRef.current?.getAction('editor.unfoldAll')?.run();
  };

  const handleFoldAll = () => {
    outputEditorRef.current?.getAction('editor.foldAll')?.run();
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

      {/* Split view: Left Input, Right Output */}
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
              value={sharedInput}
              onChange={onSharedInputChange}
              language="json"
              errorLocation={parseError}
            />
          </div>
        </div>

        {/* Right Pane: Output Preview with [Text | Tree] Toggle */}
        <div className="w-1/2 flex flex-col min-w-0 bg-canvas">
          <div className="h-10 border-b border-hairline bg-canvas-soft px-3 flex items-center justify-between gap-2 text-xs shrink-0">
            {/* View Switcher: Text | Tree */}
            <div className="flex items-center bg-canvas border border-hairline rounded-sm p-0.5">
              <button
                onClick={() => setOutputView('text')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xs transition-colors text-xs ${
                  outputView === 'text'
                    ? 'bg-primary text-canvas font-semibold'
                    : 'text-mute hover:text-ink'
                }`}
                title="View formatted text"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Text</span>
              </button>
              <button
                onClick={() => setOutputView('tree')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xs transition-colors text-xs ${
                  outputView === 'tree'
                    ? 'bg-primary text-canvas font-semibold'
                    : 'text-mute hover:text-ink'
                }`}
                title="View interactive tree hierarchy"
              >
                <FolderTree className="w-3.5 h-3.5" />
                <span>Tree</span>
              </button>
            </div>

            {/* Controls specific to Text View */}
            {outputView === 'text' ? (
              <div className="flex items-center gap-2">
                {/* Indent selector */}
                <select
                  value={indent}
                  onChange={(e) => setIndent(e.target.value as IndentOption)}
                  className="bg-canvas border border-hairline text-ink rounded-sm px-2 py-1 text-xs focus:outline-none focus:border-primary font-mono cursor-pointer"
                  title="Indentation"
                >
                  <option value="2">2 spaces</option>
                  <option value="4">4 spaces</option>
                  <option value="tab">Tab</option>
                  <option value="minify">Minify</option>
                </select>

                {/* Sort keys toggle */}
                <button
                  onClick={() => setSortKeys(!sortKeys)}
                  className={`px-2 py-1 rounded-sm border text-xs font-mono transition-colors ${
                    sortKeys
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-hairline text-mute hover:text-ink bg-canvas'
                  }`}
                  title="Sort object keys alphabetically"
                >
                  A-Z
                </button>

                {/* Icon-only Expand All / Collapse All */}
                <div className="flex items-center gap-1 border-l border-hairline pl-2">
                  <button
                    onClick={handleUnfoldAll}
                    className="p-1 rounded-sm border border-hairline hover:bg-canvas text-mute hover:text-ink transition-colors"
                    title="Expand all"
                  >
                    <ChevronsUpDown className="w-3.5 h-3.5 text-primary" />
                  </button>
                  <button
                    onClick={handleFoldAll}
                    className="p-1 rounded-sm border border-hairline hover:bg-canvas text-mute hover:text-ink transition-colors"
                    title="Collapse all"
                  >
                    <ChevronsDownUp className="w-3.5 h-3.5 text-mute" />
                  </button>
                </div>

                {/* Smart Repair Trigger */}
                <button
                  onClick={handleSmartRepair}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-sm border border-hairline hover:border-primary text-ink hover:text-primary bg-canvas text-xs transition-colors"
                  title="Smart format / Repair broken JSON"
                >
                  <Wrench className="w-3.5 h-3.5 text-primary" />
                  <span>Smart format</span>
                </button>

                {/* Copy Output Button */}
                <button
                  onClick={handleCopyOutput}
                  disabled={!formattedOutput}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-sm bg-primary hover:bg-primary-soft text-canvas font-semibold text-xs transition-colors disabled:opacity-40"
                  title="Copy strict formatted JSON"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSmartRepair}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-sm border border-hairline hover:border-primary text-ink hover:text-primary bg-canvas text-xs transition-colors"
                  title="Smart format / Repair broken JSON"
                >
                  <Wrench className="w-3.5 h-3.5 text-primary" />
                  <span>Smart format</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Pane Body: Text or Tree */}
          <div className="flex-1 relative flex flex-col min-h-0">
            {outputView === 'text' ? (
              <>
                <div className="flex-1 relative">
                  <Editor
                    value={formattedOutput}
                    readOnly={true}
                    language="json"
                    editorRef={outputEditorRef}
                  />
                </div>
                {/* Size stats footer */}
                <div className="h-8 border-t border-hairline bg-canvas-soft px-3 flex items-center justify-between text-[11px] text-mute font-mono shrink-0">
                  <div className="flex items-center gap-2">
                    <span>In: {sizeMetrics.inputFormatted}</span>
                    <ArrowRight className="w-3 h-3 text-hairline-soft" />
                    <span className="text-primary">Out: {sizeMetrics.outputFormatted}</span>
                    {sizeMetrics.inputBytes > 0 && (
                      <span className="text-mute">
                        ({sizeMetrics.reductionPercentage >= 0 ? `-${sizeMetrics.reductionPercentage}%` : `+${Math.abs(sizeMetrics.reductionPercentage)}%`})
                      </span>
                    )}
                  </div>
                  <span className="text-ink">Strict JSON</span>
                </div>
              </>
            ) : ast ? (
              <TreeView
                ast={ast}
                mode="inspector"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-mute p-6 text-center">
                <FolderTree className="w-12 h-12 stroke-[1.2] mb-3 text-hairline" />
                <p className="text-sm font-semibold text-ink">No Valid JSON AST</p>
                <p className="text-xs text-mute mt-1">
                  Fix parsing errors on the left or click Smart format to repair.
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
