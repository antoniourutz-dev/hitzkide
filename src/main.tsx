import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { validateEnvironment } from './lib/env';
import { ErrorBoundary } from './components/ErrorBoundary';
import { observabilityService } from './analytics/observabilityService';
import { APP_VERSION } from './config/appMetadata';

if (import.meta.env.DEV) {
  const envResult = validateEnvironment();
  if (!envResult.valid) {
    observabilityService.trackEvent('environment.validation_error', 'environment', {
      errors: envResult.errors,
      warnings: envResult.warnings,
    }, 'error');
  }
  if (envResult.warnings.length > 0) {
    observabilityService.trackEvent('environment.validation_warning', 'environment', {
      warnings: envResult.warnings,
    }, 'warning');
  }
}

observabilityService.trackEvent('app.boot', 'runtime', {
  appVersion: APP_VERSION,
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
});
void observabilityService.flushEventsToSupabase('app_boot');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary
      onError={(error, errorInfo) => {
        observabilityService.captureError('runtime.unhandled', 'runtime', error, errorInfo);
        void observabilityService.flushEventsToSupabase('runtime_error');
      }}
    >
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
