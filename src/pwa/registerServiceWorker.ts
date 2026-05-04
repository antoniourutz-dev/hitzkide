import { registerSW } from 'virtual:pwa-register';

export function register() {
  if ('serviceWorker' in navigator) {
    registerSW({
      onNeedRefresh() {
        console.log('Bertsio berria eskuragarri!');
      },
      onOfflineReady() {
        console.log('Aplikazioa prest dago konexiorik gabe!');
      },
    });
  }
}
