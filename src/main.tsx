import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App.tsx';
// @ts-expect-error CSS is handled by the bundler.
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
