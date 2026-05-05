import { useEffect, useRef, type KeyboardEvent } from 'react';
import { Check } from 'lucide-react';
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
        return 'option-btn-correct';
      case 'incorrect':
        return 'option-btn-incorrect';
      default:
        return disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-emerald-500 hover:bg-emerald-50';
    }
  };

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={`option-btn ${getStatusClasses()}`}
      id={`option-${word.id}`}
      role="option"
      aria-selected={status !== 'neutral'}
      aria-disabled={disabled}
      aria-label={`${word.word}${statusLabel ? `, ${statusLabel}` : ''}`}
      tabIndex={disabled ? -1 : 0}
    >
      <span className={`text-xl sm:text-2xl font-black tracking-tight ${
        status === 'correct' ? 'text-success' : 
        status === 'incorrect' ? 'text-error' : 
        'text-ink group-hover:text-emerald-600'
      }`}>
        {word.word}
      </span>

      <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
        status === 'correct' ? 'bg-success border-success scale-100' :
        status === 'incorrect' ? 'bg-error border-error scale-100' :
        'border-hairline scale-90'
      }`}>
        {status === 'correct' || status === 'incorrect' ? (
          <Check size={18} className="text-white" strokeWidth={4} aria-hidden="true" />
        ) : (
          <div className="w-1.5 h-1.5 bg-stone rounded-full" aria-hidden="true" />
        )}
      </div>
    </button>
  );
}