import { ArrowLeft, BarChart2, RefreshCw } from 'lucide-react';
import { playerService } from '../services/playerService';
import { discourseClozeDiagnosisService } from '../services/discourseClozeDiagnosisService';
import { useNavigate } from 'react-router-dom';
import { usePlayerProfile } from '../hooks/usePlayerProfile';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { authService } from '../services/authService';

export default function DiscourseClozeHomePage() {
  const navigate = useNavigate();
  const profile = usePlayerProfile();
  const [user, setUser] = useState<User | null>(null);
  const stats = playerService.getDiscourseClozeStats(profile);
  const diagnosis = discourseClozeDiagnosisService.getDiscourseDiagnosis(stats);
  const reviewCount = stats.questionsToReview;
  const isAdituaUnlocked = profile.unlockedLevels.includes('Aditua');

  useEffect(() => {
    authService.getCurrentUser().then(setUser);
  }, []);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 text-slate-700 hover:text-brand-primary transition-colors" aria-label="Hasierara itzuli">
          <ArrowLeft aria-hidden="true" />
        </button>
        <button onClick={() => navigate('/stats')} className="p-2 text-slate-700 hover:text-brand-primary transition-colors" aria-label="Estatistikak ikusi">
          <BarChart2 aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-2">
          <h2 className="text-3xl font-black text-brand-text tracking-tight">Antolatzaileak</h2>
          <p className="font-bold text-brand-accent">Testua lotu, ideiak antolatu eta ñabardurak landu</p>
      </div>

      {!user && (
        <div className="sleek-card p-4 bg-sky-50 text-sm font-semibold text-sky-900">
          Saioa hasi behar duzu antolatzaileen aurrerapena Supabasen gordetzeko.
        </div>
      )}

      <div className="sleek-card p-5 space-y-4">
          <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Zure egoera</p>
              {stats.totalSessions === 0 ? (
                  <p className="text-sm font-bold text-slate-700">Oraindik ez duzu saiorik jokatu.</p>
              ) : (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex flex-col">
                          <span className="text-slate-500">Asmatze tasa:</span>
                          <span className="font-black text-slate-800">{Math.round(stats.accuracy * 100)}%</span>
                      </div>
                      <div className="flex flex-col">
                          <span className="text-slate-500">Menderatuta:</span>
                          <span className="font-black text-slate-800">{stats.masterySummary.mastered}</span>
                      </div>
                      <div className="flex flex-col">
                          <span className="text-slate-500">Errepasatzeko:</span>
                          <span className="font-black text-slate-800">{reviewCount}</span>
                      </div>
                      <div className="flex flex-col">
                          <span className="text-slate-500">Arlo ahulena:</span>
                          <span className="font-black text-slate-800 capitalize">
                              {diagnosis.weakestFunctions.length > 0 ? diagnosis.weakestFunctions[0].labelEu : '-'}
                          </span>
                      </div>
                  </div>
              )}
          </div>

          <div className="flex gap-2">
              <button onClick={() => navigate('/stats')} className="flex-1 sleek-btn-secondary text-xs py-2 px-3">
                  Estatistikak
              </button>
              {reviewCount > 0 && (
                  <button onClick={() => navigate(user ? `/discourse/10/review` : '/profile')} className="flex-1 sleek-btn-secondary bg-orange-50 text-orange-800 text-xs py-2 px-3 flex items-center justify-center gap-2">
                      <RefreshCw size={14} /> Errepasatu
                  </button>
              )}
          </div>
      </div>

      <p className="text-slate-600 leading-relaxed text-sm">
        Aukeratu testuinguruan egokiena den lokailua edo testu-antolatzailea. Ikasi zergatik den egokia eta zergatik ez diren beste aukerak hain zehatzak.
      </p>

      <div className="grid gap-3 pt-4">
        {reviewCount > 0 && (
          <button
             onClick={() => navigate(user ? '/discourse/10/review' : '/profile')}
             className="sleek-card-interactive relative flex flex-col items-start p-4 bg-orange-50"
          >
             <div className="absolute top-4 right-4 text-orange-400">
                 <RefreshCw size={20} />
             </div>
             <span className="font-black text-orange-800">Errepasoa</span>
             <span className="text-xs font-bold uppercase tracking-wider text-orange-600">{reviewCount} errepasatzeko</span>
          </button>
        )}

        {[5, 10, 15].map(size => (
          <button
             key={size}
             onClick={() => navigate(user ? `/discourse/${size}/normal` : '/profile')}
             className="sleek-card-interactive flex flex-col items-start p-4 bg-white"
          >
            <span className="font-black text-slate-800">
                {size === 5 ? 'Saio azkarra' : size === 10 ? 'Entrenamendua' : 'Erronka'}
            </span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{size} galdera</span>
          </button>
        ))}

        <button
           disabled={!isAdituaUnlocked}
           onClick={() => user ? (isAdituaUnlocked && navigate('/discourse/10/aditua')) : navigate('/profile')}
           className={[
             'sleek-card-interactive flex flex-col items-start p-4',
             isAdituaUnlocked ? 'bg-emerald-50' : 'bg-slate-50 opacity-70 cursor-not-allowed',
           ].join(' ')}
        >
            <span className={`font-black ${isAdituaUnlocked ? "text-emerald-800" : "text-slate-400"}`}>Aditu modua</span>
            <span className={`text-xs font-bold uppercase tracking-wider ${isAdituaUnlocked ? "text-emerald-600" : "text-slate-400"}`}>
                {isAdituaUnlocked ? '10 galdera aurreratu' : 'Maila altuagoetan desblokeatuko da'}
            </span>
        </button>
      </div>

      <button onClick={() => navigate('/stats')} className="w-full sleek-btn-secondary mt-4 flex items-center justify-center gap-3">
          <BarChart2 size={20} />
          Estatistikak ikusi
      </button>
    </div>
  );
}
