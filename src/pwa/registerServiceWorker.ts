import { registerSW } from 'virtual:pwa-register';
import { observabilityService } from '../analytics/observabilityService';

async function clearSupabaseRuntimeCaches() {
  if (!('caches' in window)) return;

  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((cacheName) => cacheName.startsWith('supabase-cache-'))
      .map((cacheName) => caches.delete(cacheName))
  );
}

export function register() {
  if ('serviceWorker' in navigator) {
    void clearSupabaseRuntimeCaches();

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
