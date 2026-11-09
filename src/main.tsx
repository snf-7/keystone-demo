import '@fontsource/ibm-plex-sans-arabic/arabic-400.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-500.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-600.css';
import '@fontsource/ibm-plex-sans-arabic/latin-400.css';
import '@fontsource/ibm-plex-sans-arabic/latin-500.css';
import '@fontsource/ibm-plex-sans-arabic/latin-600.css';
import '@xyflow/react/dist/style.css';
import './index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter, MemoryRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './ErrorBoundary';

// Pages has no SPA fallback -> hash routes; the single-file embed has no usable URL -> in-memory routes
const Router = import.meta.env.VITE_MEMORY === '1' ? MemoryRouter : import.meta.env.VITE_STATIC === '1' ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ErrorBoundary><Router><App /></Router></ErrorBoundary></React.StrictMode>,
);
