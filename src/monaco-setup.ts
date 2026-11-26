/**
 * Monaco from same-origin static files under /monaco/vs (copied from monaco-editor/min).
 * No third-party CDN. Import this before any @monaco-editor/react component.
 *
 * Monaco is preloaded at app start (not on first tool open) and the dark theme is
 * registered in the same promise chain, so editors never paint with the default
 * light theme first or wait on a cold script load.
 */
import { loader } from '@monaco-editor/react';

const base = import.meta.env.BASE_URL || '/';
const vsPath = `${base.endsWith('/') ? base : base + '/'}monaco/vs`;

loader.config({ paths: { vs: vsPath } });

export const THEME = 'toolbox-dark';

loader
  .init()
  .then((monaco) => {
    // Loose JSON is valid input here and core/parse reports real errors, so
    // Monaco's strict JSON diagnostics would only add false error marks.
    monaco.json.jsonDefaults.setDiagnosticsOptions({ validate: false });

    monaco.editor.defineTheme(THEME, {
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
  })
  .catch(() => {});
