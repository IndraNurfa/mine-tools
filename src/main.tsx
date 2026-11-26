import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App.tsx';
// Fonts are bundled with the app: no third-party requests.
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './index.css';
import './monaco-setup.ts';
import { scrubStoredSecrets } from './lib/storage.ts';

// Remove tokens and passwords saved by earlier versions.
scrubStoredSecrets();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
