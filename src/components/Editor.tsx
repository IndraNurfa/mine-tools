import React, { useRef, useEffect } from 'react';
import MonacoEditor, { OnMount } from '@monaco-editor/react';

interface EditorProps {
  value: string;
  onChange?: (val: string) => void;
  readOnly?: boolean;
  language?: string;
  errorLocation?: { line: number; column: number; message: string } | null;
  onMount?: (editor: any, monaco: any) => void;
  editorRef?: React.MutableRefObject<any>;
}

export const Editor: React.FC<EditorProps> = ({
  value,
  onChange,
  readOnly = false,
  language = 'json',
  errorLocation,
  onMount,
  editorRef,
}) => {
  const internalEditorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    internalEditorRef.current = editor;
    monacoRef.current = monaco;
    if (editorRef) {
      editorRef.current = editor;
    }

    monaco.editor.setTheme('toolbox-dark');

    if (onMount) {
      onMount(editor, monaco);
    }
  };

  // Update error markers
  useEffect(() => {
    if (!monacoRef.current || !internalEditorRef.current) return;
    const model = internalEditorRef.current.getModel();
    if (!model) return;

    if (errorLocation) {
      monacoRef.current.editor.setModelMarkers(model, 'toolbox-parser', [
        {
          startLineNumber: errorLocation.line,
          startColumn: errorLocation.column,
          endLineNumber: errorLocation.line,
          endColumn: errorLocation.column + 1,
          message: errorLocation.message,
          severity: monacoRef.current.MarkerSeverity.Error,
        },
      ]);
    } else {
      monacoRef.current.editor.setModelMarkers(model, 'toolbox-parser', []);
    }
  }, [errorLocation, value]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-canvas">
      <MonacoEditor
        height="100%"
        width="100%"
        language={language}
        value={value}
        onChange={(val) => onChange && onChange(val || '')}
        theme="toolbox-dark"
        options={{
          readOnly,
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
          cursorSmoothCaretAnimation: 'on',
          renderWhitespace: 'none',
          padding: { top: 12, bottom: 12 },
        }}
        loading={<div className="w-full h-full bg-canvas" />}
        onMount={handleEditorDidMount}
      />
    </div>
  );
};
