import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { register } from './pwa/registerServiceWorker';
import { validateEnvironment } from './lib/env';
import { ErrorBoundary } from './components/ErrorBoundary';

if (import.meta.env.DEV) {
  const envResult = validateEnvironment();
  if (!envResult.valid) {
    console.error('⚠️ Configuración de entorno incompleta:', envResult.errors);
  }
}

register();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
