import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Kargatzen...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <Loader2 size={40} className="text-emerald-500 animate-spin" />
      <p className="text-slate-400 font-medium italic">{message}</p>
    </div>
  );
}
