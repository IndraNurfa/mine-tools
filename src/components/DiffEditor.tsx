import React, { useRef, useEffect } from 'react';
import { DiffEditor as MonacoDiffEditor, DiffOnMount } from '@monaco-editor/react';

interface DiffEditorProps {
  original: string;
  modified: string;
  onOriginalChange?: (val: string) => void;
  onModifiedChange?: (val: string) => void;
  language?: string;
  readOnly?: boolean;
}

export const DiffEditor: React.FC<DiffEditorProps> = ({
  original,
  modified,
  onOriginalChange,
  onModifiedChange,
  language = 'json',
  readOnly = false,
}) => {
  const diffEditorRef = useRef<any>(null);
  const isInternalChangeRef = useRef(false);

  const handleMount: DiffOnMount = (editor, monaco) => {
    diffEditorRef.current = editor;
    monaco.editor.setTheme('toolbox-dark');

    const origEditor = editor.getOriginalEditor();
    const modEditor = editor.getModifiedEditor();

    origEditor.onDidChangeModelContent(() => {
      if (isInternalChangeRef.current) return;
      const val = origEditor.getValue();
      if (onOriginalChange) {
        onOriginalChange(val);
      }
    });

    modEditor.onDidChangeModelContent(() => {
      if (isInternalChangeRef.current) return;
      const val = modEditor.getValue();
      if (onModifiedChange) {
        onModifiedChange(val);
      }
    });
  };

  // Sync external prop changes if needed
  useEffect(() => {
    if (!diffEditorRef.current) return;
    const origEditor = diffEditorRef.current.getOriginalEditor();
    const modEditor = diffEditorRef.current.getModifiedEditor();

    if (origEditor && origEditor.getValue() !== original) {
      isInternalChangeRef.current = true;
      origEditor.setValue(original);
      isInternalChangeRef.current = false;
    }

    if (modEditor && modEditor.getValue() !== modified) {
      isInternalChangeRef.current = true;
      modEditor.setValue(modified);
      isInternalChangeRef.current = false;
    }
  }, [original, modified]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-canvas">
      <MonacoDiffEditor
        height="100%"
        width="100%"
        language={language}
        original={original}
        modified={modified}
        theme="toolbox-dark"
        options={{
          readOnly,
          originalEditable: !readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "'SF Mono', 'JetBrains Mono', Menlo, Monaco, Consolas, monospace",
          automaticLayout: true,
          renderSideBySide: true,
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 },
        }}
        onMount={handleMount}
      />
    </div>
  );
};
