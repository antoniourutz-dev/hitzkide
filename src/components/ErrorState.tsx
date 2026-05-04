import { AlertCircle, RotateCcw } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center space-y-6">
      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
        <AlertCircle size={32} />
      </div>
      <div className="space-y-2">
        <h3 className="font-bold text-slate-800">Akats bat gertatu da</h3>
        <p className="text-sm text-slate-500">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center space-x-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold active:scale-95 transition-all"
        >
          <RotateCcw size={18} />
          <span>Saiatu berriro</span>
        </button>
      )}
    </div>
  );
}
