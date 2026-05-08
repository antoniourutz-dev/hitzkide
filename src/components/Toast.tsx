import { motion, AnimatePresence } from 'motion/react';
import { useEffect } from 'react';
import { cn } from '../lib/utils';

export interface ToastData {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'achievement';
}

interface ToastProps {
  toasts: ToastData[];
  onRemove: (id: string) => void;
}

export default function Toast({ toasts, onRemove }: ToastProps) {
  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 w-full max-w-xs pointer-events-none"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastData; onRemove: (id: string) => void; key?: string }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className={cn(
        "px-6 py-3 rounded-none border-[3px] font-black text-xs uppercase tracking-widest pointer-events-auto mb-2 shadow-[6px_6px_0px_0px_#0f172a]",
        toast.type === 'achievement' ? "bg-emerald-500 text-white border-emerald-700" :
        toast.type === 'warning' ? "bg-amber-50 text-amber-900 border-brand-border" :
        toast.type === 'success' ? "bg-white text-emerald-800 border-brand-border" :
        "bg-white text-slate-900 border-brand-border"
      )}
      role="alert"
    >
      {toast.message}
    </motion.div>
  );
}
