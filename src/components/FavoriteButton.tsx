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
        "p-2 rounded-xl transition-all active:scale-95",
        isFavorite ? "bg-red-50 text-red-500" : "bg-slate-50 text-slate-300 hover:text-slate-400"
      )}
    >
      <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
    </button>
  );
}
