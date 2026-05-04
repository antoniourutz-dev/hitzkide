import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export default function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-5">
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-white/10">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-500 p-2 rounded-xl">
            <RefreshCw size={18} className={needRefresh ? "animate-spin" : ""} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold">
              {offlineReady ? 'Aplikazioa prest dago konexiorik gabe!' : 'Bertsio berria eskuragarri!'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {offlineReady ? 'Gordeta dago zure gailuan.' : 'Eguneratu azken hobekuntzak ikusteko.'}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {needRefresh && (
            <button
              onClick={() => updateServiceWorker(true)}
              className="bg-emerald-500 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-emerald-600 transition-colors"
            >
              Eguneratu
            </button>
          )}
          <button onClick={close} className="p-2 text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
