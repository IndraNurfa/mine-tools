import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useToast } from '../../components/Toast.tsx';
import { parseLooseJSON } from '../../core/parse/parser.ts';
import { formatAST } from '../../core/format/formatter.ts';
import { computeSemanticDiff, summarizeDiff, DiffChangeType } from '../../core/diff/semanticDiff.ts';
import { PathFormat, formatPath } from '../../core/path/format.ts';
import {
  ArrowRightLeft,
  Copy,
  Check,
  PlusCircle,
  MinusCircle,
  AlertCircle,
  ClipboardPaste,
  Trash2,
  Sparkles,
  ChevronsUpDown,
  ChevronsDownUp,
  WrapText,
  AlignJustify,
} from 'lucide-react';

const SAMPLE_LEFT = `{
  "name": "Toolbox API",
  "version": 1,
  "data": {
    "items": [
      { "id": 1, "price": 10 },
      { "id": 2, "price": 20 },
      { "id": 3, "price": 10 }
    ],
    "bigInt": 12345678901234567890
  },
  "tags": ["dev", "v1"]
}`;

const SAMPLE_RIGHT = `{
  "name": "Toolbox API",
  "version": 1,
  "data": {
    "items": [
      { "id": 1, "price": 10 },
      { "id": 2, "price": 25 },
      { "id": 3, "price": 12 }
    ],
    "bigInt": 12345678901234567890,
    "newFeature": true
  }
}`;

// ────────────────────────────────────────────────────────────
// Standalone Editor pane — fully editable, not Monaco diff editor
// ────────────────────────────────────────────────────────────
interface EditorPaneProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  editorRef?: React.MutableRefObject<any>;
  onMount?: (editor: any, monaco: any) => void;
  error?: string | null;
}

const EditorPane: React.FC<EditorPaneProps> = ({
  label,
  value,
  onChange,
  editorRef,
  onMount: externalOnMount,
  error,
}) => {
  const { showToast } = useToast();

  const handleMount: OnMount = (editor, monaco) => {
    if (editorRef) editorRef.current = editor;

    // Define theme once (idempotent)
    monaco.editor.defineTheme('toolbox-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'string.key.json', foreground: '00d992', fontStyle: 'bold' },
        { token: 'string.value.json', foreground: 'f2f2f2' },
        { token: 'number.json', foreground: '2fd6a1' },
        { token: 'keyword.json', foreground: '00d992' },
        { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
      ],
      colors: {
        'editor.background': '#101010',
        'editor.foreground': '#f2f2f2',
        'editor.lineHighlightBackground': '#1a1a1a',
        'editorLineNumber.foreground': '#3d3a39',
        'editorLineNumber.activeForeground': '#00d992',
        'editor.selectionBackground': '#3d3a39',
        'editor.inactiveSelectionBackground': '#222222',
        'editorCursor.foreground': '#00d992',
        'editorIndentGuide.background': '#1f1f1f',
        'editorIndentGuide.activeBackground': '#3d3a39',
      },
    });
    monaco.editor.setTheme('toolbox-dark');

    if (externalOnMount) externalOnMount(editor, monaco);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      onChange(text);
      showToast(`Pasted into ${label}`);
    } catch {
      showToast('Clipboard access denied', { type: 'error' });
    }
  };

  const handleClear = () => {
    onChange('');
    showToast(`${label} cleared`);
  };

  const handleFoldAll = () => {
    if (!editorRef?.current) return;
    editorRef.current.getAction('editor.foldAll')?.run();
  };

  const handleUnfoldAll = () => {
    if (!editorRef?.current) return;
    editorRef.current.getAction('editor.unfoldAll')?.run();
  };

  return (
    <div className="flex flex-col h-full w-full min-w-0">
      {/* Pane header */}
      <div className="h-10 border-b border-hairline bg-canvas-soft px-3 flex items-center justify-between gap-2 text-xs shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-ink uppercase tracking-wider text-[11px]">{label}</span>
          {error && (
            <span className="text-[10px] text-amber-400 font-mono bg-amber-950/30 border border-amber-600/30 px-1.5 py-0.5 rounded-xs">
              Parse error
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
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
          <div className="w-px h-4 bg-hairline mx-1" />
          <button
            onClick={handlePaste}
            className="flex items-center gap-1 px-2 py-1 rounded-sm border border-hairline hover:bg-canvas text-mute hover:text-ink text-xs transition-colors"
            title="Paste from clipboard"
          >
            <ClipboardPaste className="w-3 h-3" />
            <span>Paste</span>
          </button>
          <button
            onClick={handleClear}
            className="p-1 rounded-sm border border-hairline hover:bg-canvas text-mute hover:text-red-400 transition-colors"
            title="Clear"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Monaco Editor — fully editable */}
      <div className="flex-1 relative">
        <Editor
          height="100%"
          language="json"
          value={value}
          theme="toolbox-dark"
          onChange={(val) => onChange(val ?? '')}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'SF Mono', 'JetBrains Mono', Menlo, Monaco, Consolas, monospace",
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            folding: true,
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            padding: { top: 10, bottom: 10 },
          }}
          onMount={handleMount}
        />
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// Main DiffTool
// ────────────────────────────────────────────────────────────
export const DiffTool: React.FC = () => {
  const { showToast } = useToast();
  const leftEditorRef = useRef<any>(null);
  const rightEditorRef = useRef<any>(null);

  const [leftInput, setLeftInput] = useState<string>(SAMPLE_LEFT);
  const [rightInput, setRightInput] = useState<string>(SAMPLE_RIGHT);

  // Diff mode: 'semantic' table or monaco-style inline highlights on both panes
  const [diffMode, setDiffMode] = useState<'inline' | 'semantic'>('inline');

  // Highlight decorations from diff
  const [leftDecorations, setLeftDecorations] = useState<string[]>([]);
  const [rightDecorations, setRightDecorations] = useState<string[]>([]);

  const [pathFormat, setPathFormat] = useState<PathFormat>(() => {
    return (sessionStorage.getItem('toolbox_path_format') as PathFormat) || 'js';
  });

  const [changeTypeFilter, setChangeTypeFilter] = useState<'all' | DiffChangeType>('all');

  // Compute ASTs
  const { leftAST, leftError } = useMemo(() => {
    if (!leftInput.trim()) return { leftAST: null, leftError: null };
    try {
      return { leftAST: parseLooseJSON(leftInput), leftError: null };
    } catch (e: any) {
      return { leftAST: null, leftError: e.message as string };
    }
  }, [leftInput]);

  const { rightAST, rightError } = useMemo(() => {
    if (!rightInput.trim()) return { rightAST: null, rightError: null };
    try {
      return { rightAST: parseLooseJSON(rightInput), rightError: null };
    } catch (e: any) {
      return { rightAST: null, rightError: e.message as string };
    }
  }, [rightInput]);

  // Semantic diff rows
  const diffRows = useMemo(() => {
    if (!leftAST || !rightAST) return [];
    return computeSemanticDiff(leftAST, rightAST);
  }, [leftAST, rightAST]);

  const diffSummary = useMemo(() => summarizeDiff(diffRows), [diffRows]);

  const filteredRows = useMemo(() => {
    if (changeTypeFilter === 'all') return diffRows;
    return diffRows.filter((r) => r.type === changeTypeFilter);
  }, [diffRows, changeTypeFilter]);

  // Apply inline diff highlights to left & right editors
  useEffect(() => {
    if (diffMode !== 'inline') return;
    if (!leftEditorRef.current || !rightEditorRef.current) return;
    if (!leftAST || !rightAST) return;

    const monacoModule = (window as any).__monaco;
    if (!monacoModule) return;

    // Build line-based highlights using AST node offsets
    const leftLines = leftInput.split('\n');
    const rightLines = rightInput.split('\n');

    const leftDecors: any[] = [];
    const rightDecors: any[] = [];

    for (const row of diffRows) {
      // Find line numbers from AST node positions
      if (row.type === 'removed' || row.type === 'changed') {
        // Find in left AST
        const node = findNodeAtPath(leftAST, row.path);
        if (node) {
          const line = node.start.line;
          leftDecors.push({
            range: new monacoModule.Range(line, 1, line, 1),
            options: {
              isWholeLine: true,
              className: row.type === 'removed' ? 'diff-removed-line' : 'diff-changed-line',
              linesDecorationsClassName: row.type === 'removed' ? 'diff-removed-gutter' : 'diff-changed-gutter',
            },
          });
        }
      }
      if (row.type === 'added' || row.type === 'changed') {
        const node = findNodeAtPath(rightAST, row.path);
        if (node) {
          const line = node.start.line;
          rightDecors.push({
            range: new monacoModule.Range(line, 1, line, 1),
            options: {
              isWholeLine: true,
              className: row.type === 'added' ? 'diff-added-line' : 'diff-changed-line',
              linesDecorationsClassName: row.type === 'added' ? 'diff-added-gutter' : 'diff-changed-gutter',
            },
          });
        }
      }
    }

    const newLeftDec = leftEditorRef.current.deltaDecorations(leftDecorations, leftDecors);
    const newRightDec = rightEditorRef.current.deltaDecorations(rightDecorations, rightDecors);
    setLeftDecorations(newLeftDec);
    setRightDecorations(newRightDec);
  }, [diffRows, diffMode, leftAST, rightAST, leftInput, rightInput]);

  // Capture monaco module on first editor mount
  const handleLeftEditorMount = (editor: any, monaco: any) => {
    leftEditorRef.current = editor;
    (window as any).__monaco = monaco;
  };

  const handleRightEditorMount = (editor: any, monaco: any) => {
    rightEditorRef.current = editor;
    (window as any).__monaco = monaco;
  };

  const handleSwap = () => {
    setLeftInput(rightInput);
    setRightInput(leftInput);
    showToast('Swapped Left and Right');
  };

  const handleLoadSample = () => {
    setLeftInput(SAMPLE_LEFT);
    setRightInput(SAMPLE_RIGHT);
    showToast('Loaded sample data');
  };

  const handleFormat = (side: 'left' | 'right') => {
    const input = side === 'left' ? leftInput : rightInput;
    const ast = side === 'left' ? leftAST : rightAST;
    if (!ast) {
      showToast(`${side === 'left' ? 'Left' : 'Right'} has a parse error`, { type: 'error' });
      return;
    }
    const formatted = formatAST(ast, { indent: '2' });
    if (side === 'left') setLeftInput(formatted);
    else setRightInput(formatted);
    showToast(`${side === 'left' ? 'Left' : 'Right'} formatted`);
  };

  const handleCopyPath = (path: (string | number)[]) => {
    const formatted = formatPath(path, pathFormat);
    navigator.clipboard.writeText(formatted);
    showToast('Path copied', { code: formatted || '<root>' });
  };

  return (
    <div className="flex flex-col h-full w-full bg-canvas overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="h-11 border-b border-hairline bg-canvas-soft px-4 flex items-center justify-between gap-3 text-xs shrink-0">
        {/* Left actions */}
        <div className="flex items-center gap-2">
          {/* Diff mode switch */}
          <div className="flex items-center bg-canvas border border-hairline rounded-sm p-0.5">
            <button
              onClick={() => setDiffMode('inline')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xs transition-colors ${
                diffMode === 'inline'
                  ? 'bg-primary text-canvas font-semibold'
                  : 'text-mute hover:text-ink'
              }`}
            >
              <AlignJustify className="w-3.5 h-3.5" />
              <span>Inline Diff</span>
            </button>
            <button
              onClick={() => setDiffMode('semantic')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xs transition-colors ${
                diffMode === 'semantic'
                  ? 'bg-primary text-canvas font-semibold'
                  : 'text-mute hover:text-ink'
              }`}
            >
              <WrapText className="w-3.5 h-3.5" />
              <span>Semantic</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-canvas border border-hairline text-mute ml-1">
                {diffSummary.total}
              </span>
            </button>
          </div>

          {/* Summary pills */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-hairline">
            <span className="text-primary font-mono">+{diffSummary.added}</span>
            <span className="text-red-400 font-mono">-{diffSummary.removed}</span>
            <span className="text-amber-400 font-mono">~{diffSummary.changed}</span>
          </div>

          {/* Swap & sample */}
          <div className="flex items-center gap-1 pl-2 border-l border-hairline">
            <button
              onClick={handleSwap}
              className="p-1 rounded-sm border border-hairline hover:bg-canvas text-mute hover:text-ink transition-colors"
              title="Swap Left ↔ Right"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleLoadSample}
              className="p-1 rounded-sm border border-hairline hover:bg-canvas text-mute hover:text-ink transition-colors"
              title="Load sample data"
            >
              <Sparkles className="w-3 h-3 text-primary" />
            </button>
          </div>
        </div>

        {/* Right: Format buttons & path format (semantic mode) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleFormat('left')}
            className="px-2.5 py-1 rounded-sm border border-hairline text-xs text-mute hover:text-ink hover:bg-canvas transition-colors"
            title="Format Left JSON"
          >
            Format Left
          </button>
          <button
            onClick={() => handleFormat('right')}
            className="px-2.5 py-1 rounded-sm border border-hairline text-xs text-mute hover:text-ink hover:bg-canvas transition-colors"
            title="Format Right JSON"
          >
            Format Right
          </button>

          {diffMode === 'semantic' && (
            <>
              <div className="w-px h-4 bg-hairline" />
              <div className="flex items-center gap-1.5">
                <span className="text-mute">Path:</span>
                <select
                  value={pathFormat}
                  onChange={(e) => {
                    setPathFormat(e.target.value as PathFormat);
                    sessionStorage.setItem('toolbox_path_format', e.target.value);
                  }}
                  className="bg-canvas border border-hairline text-ink rounded-sm px-2 py-1 text-xs focus:outline-none focus:border-primary font-mono cursor-pointer"
                >
                  <option value="js">JS</option>
                  <option value="jsonpath">JSONPath</option>
                  <option value="gjson">Gjson</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex min-h-0 divide-x divide-hairline overflow-hidden">
        {/* Left Editor */}
        <div className="flex flex-col min-w-0 overflow-hidden" style={{ width: diffMode === 'semantic' ? '35%' : '50%' }}>
          <EditorPane
            label="Original (Left)"
            value={leftInput}
            onChange={setLeftInput}
            editorRef={leftEditorRef}
            onMount={handleLeftEditorMount}
            error={leftError}
          />
        </div>

        {/* Right Editor */}
        <div className="flex flex-col min-w-0 overflow-hidden" style={{ width: diffMode === 'semantic' ? '35%' : '50%' }}>
          <EditorPane
            label="Modified (Right)"
            value={rightInput}
            onChange={setRightInput}
            editorRef={rightEditorRef}
            onMount={handleRightEditorMount}
            error={rightError}
          />
        </div>

        {/* Semantic Diff Panel — shown as 3rd column */}
        {diffMode === 'semantic' && (
          <div className="flex flex-col min-w-0 overflow-hidden border-l border-hairline" style={{ width: '30%' }}>
            {/* Panel header */}
            <div className="h-10 border-b border-hairline bg-canvas-soft px-3 flex items-center justify-between gap-2 text-xs shrink-0">
              <span className="font-semibold text-ink uppercase tracking-wider text-[11px]">
                Changes
              </span>
              {/* Filter pills */}
              <div className="flex items-center bg-canvas border border-hairline rounded-sm p-0.5">
                {(['all', 'added', 'removed', 'changed'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setChangeTypeFilter(f)}
                    className={`px-2 py-0.5 rounded-xs text-[10px] font-mono transition-colors capitalize ${
                      changeTypeFilter === f
                        ? 'bg-primary text-canvas font-semibold'
                        : 'text-mute hover:text-ink'
                    }`}
                  >
                    {f === 'all' ? `All (${diffSummary.total})` : f}
                  </button>
                ))}
              </div>
            </div>

            {/* Diff rows */}
            <div className="flex-1 overflow-y-auto">
              {filteredRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-mute">
                  <Check className="w-10 h-10 text-primary mb-2 stroke-[1.5]" />
                  <p className="text-sm font-semibold text-ink">
                    {!leftInput.trim() && !rightInput.trim()
                      ? 'Enter JSON on both sides'
                      : 'Identical'}
                  </p>
                  <p className="text-xs text-mute mt-1">No semantic differences found</p>
                </div>
              ) : (
                <div className="divide-y divide-hairline/30">
                  {filteredRows.map((row, idx) => {
                    const formatted = formatPath(row.path, pathFormat);
                    return (
                      <div
                        key={idx}
                        className="px-3 py-2.5 hover:bg-canvas-soft transition-colors group"
                      >
                        {/* Type badge + path */}
                        <div className="flex items-center gap-2 mb-1">
                          {row.type === 'added' && (
                            <span className="inline-flex items-center gap-0.5 text-primary text-[10px] font-semibold">
                              <PlusCircle className="w-3 h-3" /> Added
                            </span>
                          )}
                          {row.type === 'removed' && (
                            <span className="inline-flex items-center gap-0.5 text-red-400 text-[10px] font-semibold">
                              <MinusCircle className="w-3 h-3" /> Removed
                            </span>
                          )}
                          {row.type === 'changed' && (
                            <span className="inline-flex items-center gap-0.5 text-amber-400 text-[10px] font-semibold">
                              <AlertCircle className="w-3 h-3" /> Changed
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handleCopyPath(row.path)}
                          className="w-full text-left font-mono text-[11px] text-ink hover:text-primary transition-colors flex items-center gap-1 group/path"
                          title="Click to copy path"
                        >
                          <span className="truncate">{formatted || '<root>'}</span>
                          <Copy className="w-2.5 h-2.5 opacity-0 group-hover/path:opacity-60 shrink-0 transition-opacity" />
                        </button>

                        {/* Values */}
                        {(row.oldValue !== undefined || row.newValue !== undefined) && (
                          <div className="mt-1.5 space-y-0.5 font-mono text-[11px]">
                            {row.oldValue !== undefined && (
                              <div className="flex items-start gap-1.5">
                                <span className="text-red-400/60 shrink-0">−</span>
                                <span className="text-red-300/80 truncate line-through opacity-70">
                                  {row.oldValue}
                                </span>
                              </div>
                            )}
                            {row.newValue !== undefined && (
                              <div className="flex items-start gap-1.5">
                                <span className="text-primary shrink-0">+</span>
                                <span className="text-primary font-medium truncate">
                                  {row.newValue}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer summary */}
            <div className="h-8 border-t border-hairline bg-canvas-soft px-3 flex items-center gap-4 text-[11px] font-mono text-mute shrink-0">
              <span className="text-primary">+{diffSummary.added}</span>
              <span className="text-red-400">-{diffSummary.removed}</span>
              <span className="text-amber-400">~{diffSummary.changed}</span>
            </div>
          </div>
        )}
      </div>

      {/* Diff highlight CSS — injected once */}
      <style>{`
        .diff-removed-line { background: rgba(239,68,68,0.08) !important; }
        .diff-added-line { background: rgba(0,217,146,0.08) !important; }
        .diff-changed-line { background: rgba(251,191,36,0.08) !important; }
        .diff-removed-gutter::before { content: '−'; color: rgba(239,68,68,0.7); font-size: 11px; margin-left: 4px; }
        .diff-added-gutter::before { content: '+'; color: rgba(0,217,146,0.7); font-size: 11px; margin-left: 4px; }
        .diff-changed-gutter::before { content: '~'; color: rgba(251,191,36,0.7); font-size: 11px; margin-left: 4px; }
      `}</style>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// Helper: walk AST to find node at path
// ────────────────────────────────────────────────────────────
import { ASTNode } from '../../core/parse/types.ts';
import { PathSegment } from '../../core/path/format.ts';

function findNodeAtPath(root: ASTNode, path: PathSegment[]): ASTNode | null {
  let node: ASTNode = root;
  for (const seg of path) {
    if (node.type === 'object') {
      const prop = node.children.find((c) => c.key === seg);
      if (!prop) return null;
      node = prop.value;
    } else if (node.type === 'array' && typeof seg === 'number') {
      if (seg >= node.children.length) return null;
      node = node.children[seg];
    } else {
      return null;
    }
  }
  return node;
}
