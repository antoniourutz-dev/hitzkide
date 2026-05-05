import { registerSW } from 'virtual:pwa-register';

export function register() {
  if ('serviceWorker' in navigator) {
    registerSW();
  }
}
