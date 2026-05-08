import { ArrowLeft, Trash2, Book } from 'lucide-react';
import { favoritesService } from '../services/favoritesService';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getConceptLabel, getGrammarLabel } from '../utils/labels';

export default function FavoritesPage() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState(favoritesService.getFavorites());

  const handleRemove = (id: number) => {
    const item = favorites.find(f => f.id === id);
    if (item) {
      favoritesService.toggleFavorite(item);
      setFavorites(favoritesService.getFavorites());
    }
  };

  return (
    <div className="flex flex-col space-y-8">
      <div className="flex items-center space-x-4">
        <button onClick={() => navigate('/')} className="p-2 rounded-full text-slate-700 hover:text-brand-primary transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-black text-brand-text tracking-tight">Gogokoak</h2>
      </div>

      <div className="space-y-4">
        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 opacity-50">
            <Book size={48} className="text-slate-300" />
            <p className="text-sm font-medium italic">Ez duzu hitzik gorde oraindik.</p>
          </div>
        ) : (
          favorites.map(fav => (
            <div key={fav.id} className="sleek-card p-6 space-y-4 relative">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="text-2xl font-black text-brand-text tracking-tight">{getConceptLabel(fav.concept)}</h4>
                  <div className="flex flex-wrap gap-2">
                    {fav.grammar && (
                      <span className="px-2 py-0.5 bg-white text-[9px] font-black uppercase tracking-widest text-slate-700 border-[3px] border-brand-border shadow-[2px_2px_0px_0px_#0f172a]">
                        {getGrammarLabel(fav.grammar)}
                      </span>
                    )}
                    {fav.reviewed_level && (
                      <span className="px-2 py-0.5 bg-blue-50 text-[9px] font-black uppercase tracking-widest text-blue-800 border-[3px] border-brand-border shadow-[2px_2px_0px_0px_#0f172a]">
                        {fav.reviewed_level}
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => handleRemove(fav.id)}
                  className="p-2 text-slate-600 hover:text-rose-700 transition-colors"
                  aria-label="Kendu gogokoetatik"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <div className="space-y-3 pt-4 border-t-[3px] border-brand-border">
                {fav.words.map((w, idx) => (
                  <div key={idx} className="flex flex-col space-y-1">
                    <span className="font-black text-brand-text text-lg uppercase tracking-tight">{w.word}</span>
                    {w.note && (
                      <p className="text-xs text-slate-500 italic leading-relaxed">{w.note}</p>
                    )}
                    <div className="flex gap-2 text-[9px] font-bold text-slate-400 opacity-60 uppercase">
                      {w.register && <span>{w.register}</span>}
                      {w.dialect && <span>{w.dialect}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
