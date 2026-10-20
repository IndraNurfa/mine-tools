import React, { useRef, useEffect } from 'react';
import MonacoEditor, { OnMount, loader } from '@monaco-editor/react';

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

    // Define Voltagent Design theme
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
        'editorWhitespace.foreground': '#222222',
        'editorIndentGuide.background': '#1f1f1f',
        'editorIndentGuide.activeBackground': '#3d3a39',
      },
    });

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
        onMount={handleEditorDidMount}
      />
    </div>
  );
};
