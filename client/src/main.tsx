import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';

// Applied before first paint by the inline script in index.html; this keeps
// the attribute in sync if that script was blocked.
if (!document.documentElement.dataset.theme) {
  document.documentElement.dataset.theme = 'dark';
}

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
