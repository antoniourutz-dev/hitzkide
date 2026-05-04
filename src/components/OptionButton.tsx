import { Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { LexicalWord } from '../types/lexical';

interface OptionButtonProps {
  word: LexicalWord;
  onClick: () => void;
  status?: 'correct' | 'incorrect' | 'neutral';
  disabled?: boolean;
}

export default function OptionButton({ word, onClick, status = 'neutral', disabled }: OptionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full py-4 px-6 sm:py-5 sm:px-8 bg-white border-2 border-slate-100 rounded-2xl sm:rounded-3xl text-left hover:border-emerald-500 transition-all flex justify-between items-center group active:scale-[0.98] transition-all duration-200 shadow-sm",
        status === 'correct' && "bg-emerald-50 border-emerald-500 shadow-emerald-100",
        status === 'incorrect' && "bg-red-50 border-red-500 shadow-red-100",
        disabled && status === 'neutral' && "opacity-40 grayscale-[0.5]"
      )}
      id={`option-${word.id}`}
    >
      <span className={cn(
        "text-xl sm:text-2xl font-black tracking-tight",
        status === 'correct' ? "text-emerald-700" : status === 'incorrect' ? "text-red-700" : "text-slate-800 group-hover:text-emerald-600"
      )}>
        {word.word}
      </span>
      
      <div className={cn(
        "w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300",
        status === 'correct' ? "bg-emerald-500 border-emerald-500 rotate-0 scale-100" : 
        status === 'incorrect' ? "bg-red-500 border-red-500 rotate-0 scale-100" : "border-slate-100 scale-90"
      )}>
        {(status === 'correct' || status === 'incorrect') ? (
          <Check size={18} className="text-white" strokeWidth={4} />
        ) : (
          <div className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
        )}
      </div>
    </button>
  );
}
