import { registerSW } from 'virtual:pwa-register';
import { observabilityService } from '../analytics/observabilityService';

export function register() {
  if ('serviceWorker' in navigator) {
    registerSW({
      onOfflineReady() {
        observabilityService.trackEvent('pwa.offline_ready', 'pwa', {
          online: navigator.onLine,
        });
      },
      onNeedRefresh() {
        observabilityService.trackEvent('pwa.update_available', 'pwa');
      },
      onRegisterError(error) {
        observabilityService.captureError('pwa.registration_failed', 'pwa', error);
      },
    });
  }
}
