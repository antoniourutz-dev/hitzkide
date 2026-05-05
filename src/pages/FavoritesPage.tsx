import { ArrowLeft, Trash2, Book } from 'lucide-react';
import { favoritesService } from '../services/favoritesService';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
        <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gogokoak</h2>
      </div>

      <div className="space-y-4">
        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 opacity-50">
            <Book size={48} className="text-slate-300" />
            <p className="text-sm font-medium italic">Ez duzu hitzik gorde oraindik.</p>
          </div>
        ) : (
          favorites.map(fav => (
            <div key={fav.id} className="bg-white border-2 border-slate-50 rounded-3xl p-6 shadow-sm space-y-4 relative">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="text-2xl font-black text-slate-800 tracking-tight uppercase">{fav.concept}</h4>
                  <div className="flex flex-wrap gap-2">
                    {fav.grammar && (
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">{fav.grammar}</span>
                    )}
                    {fav.reviewed_level && (
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-500 px-2 py-0.5 rounded uppercase">{fav.reviewed_level}</span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => handleRemove(fav.id)}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                {fav.words.map((w, idx) => (
                  <div key={idx} className="flex flex-col space-y-1">
                    <span className="font-bold text-emerald-600 text-lg">{w.word}</span>
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
