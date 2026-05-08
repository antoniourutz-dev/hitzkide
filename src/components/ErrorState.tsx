import { AlertCircle, RotateCcw } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center space-y-6">
      <div className="w-16 h-16 bg-rose-50 text-rose-800 rounded-full flex items-center justify-center border-[3px] border-brand-border shadow-[6px_6px_0px_0px_#0f172a]">
        <AlertCircle size={32} />
      </div>
      <div className="space-y-2">
        <h3 className="font-black text-brand-text">Akats bat gertatu da</h3>
        <p className="text-sm text-slate-700">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="sleek-btn-primary bg-slate-900"
        >
          <RotateCcw size={18} />
          <span>Saiatu berriro</span>
        </button>
      )}
    </div>
  );
}
