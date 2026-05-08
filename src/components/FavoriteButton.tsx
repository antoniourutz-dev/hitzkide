import { Heart } from 'lucide-react';
import { cn } from '../lib/utils';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onClick: () => void;
}

export default function FavoriteButton({ isFavorite, onClick }: FavoriteButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "p-2 rounded-full transition-all active:scale-95 border-[3px] border-brand-border shadow-[2px_2px_0px_0px_#0f172a]",
        isFavorite ? "bg-rose-50 text-rose-700" : "bg-white text-slate-600 hover:text-slate-900"
      )}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? 'Kendu gogokoetatik' : 'Gehitu gogokoetara'}
    >
      <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
    </button>
  );
}
