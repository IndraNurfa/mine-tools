/**
 * Monaco from same-origin static files under /monaco/vs (copied from monaco-editor/min).
 * No third-party CDN. Import this before any @monaco-editor/react component.
 */
import { loader } from '@monaco-editor/react';

const base = import.meta.env.BASE_URL || '/';
const vsPath = `${base.endsWith('/') ? base : base + '/'}monaco/vs`;

loader.config({ paths: { vs: vsPath } });
