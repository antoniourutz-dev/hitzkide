import { useEffect, useRef, type KeyboardEvent } from 'react';
import { Check, X } from 'lucide-react';
import { LexicalWord } from '../types/lexical';

interface OptionButtonProps {
  word: LexicalWord;
  onClick: () => void;
  status?: 'correct' | 'incorrect' | 'neutral';
  disabled?: boolean;
}

export default function OptionButton({ word, onClick, status = 'neutral', disabled }: OptionButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (status !== 'neutral' && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [status]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!disabled) {
        onClick();
      }
    }
  };

  const statusLabel = status === 'correct' ? 'Zuzena' : status === 'incorrect' ? 'Okerra' : '';

  const getStatusClasses = () => {
    switch (status) {
      case 'correct':
        return 'bg-emerald-500 text-white border-emerald-700 shadow-[5px_5px_0px_0px_#047857]';
      case 'incorrect':
        return 'bg-rose-500 text-white border-rose-700 shadow-[5px_5px_0px_0px_#be123c]';
      default:
        return disabled
          ? 'bg-white text-slate-900 border-brand-border shadow-[5px_5px_0px_0px_#0f172a] opacity-60 grayscale cursor-not-allowed'
          : 'bg-white text-slate-900 border-brand-border shadow-[5px_5px_0px_0px_#0f172a] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0px_0px_#0f172a]';
    }
  };

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={`sleek-btn-option group w-full flex items-center justify-between gap-4 ${getStatusClasses()}`}
      id={`option-${word.id}`}
      role="option"
      aria-selected={status !== 'neutral'}
      aria-disabled={disabled}
      aria-label={`${word.word}${statusLabel ? `, ${statusLabel}` : ''}`}
      tabIndex={disabled ? -1 : 0}
    >
      <span className={`text-xl sm:text-2xl font-black tracking-tight ${
        status === 'correct' || status === 'incorrect' ? 'text-white' : 'text-slate-900 group-hover:text-emerald-700'
      }`}>
        {word.word}
      </span>

      <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
        status === 'correct' ? 'bg-emerald-700 border-emerald-800 scale-100' :
        status === 'incorrect' ? 'bg-rose-700 border-rose-800 scale-100' :
        'border-slate-300 scale-90'
      }`}>
        {status === 'correct' ? (
          <Check size={18} className="text-white" strokeWidth={4} aria-hidden="true" />
        ) : status === 'incorrect' ? (
          <X size={18} className="text-white" strokeWidth={4} aria-hidden="true" />
        ) : (
          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" aria-hidden="true" />
        )}
      </div>
    </button>
  );
}