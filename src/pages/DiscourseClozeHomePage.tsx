import { ArrowLeft, BarChart2, RefreshCw } from 'lucide-react';
import { playerService } from '../services/playerService';
import { discourseClozeDiagnosisService } from '../services/discourseClozeDiagnosisService';
import { useNavigate } from 'react-router-dom';

export default function DiscourseClozeHomePage() {
  const navigate = useNavigate();
  const profile = playerService.getProfile();
  const stats = playerService.getDiscourseClozeStats(profile);
  const diagnosis = discourseClozeDiagnosisService.getDiscourseDiagnosis(stats);
  const reviewCount = stats.questionsToReview;
  const isAdituaUnlocked = profile.unlockedLevels.includes('Aditua');

  return (
    <div className="p-6 space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 text-slate-400 hover:text-slate-600">
          <ArrowLeft />
        </button>
        <button onClick={() => navigate('/stats')} className="p-2 text-slate-400 hover:text-sky-500">
          <BarChart2 />
        </button>
      </div>

      <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Antolatzaileak</h2>
          <p className="font-bold text-sky-600">Testua lotu, ideiak antolatu eta ñabardurak landu</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
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
              <button onClick={() => navigate('/stats')} className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-black shadow-sm border border-slate-200">
                  Estatistikak
              </button>
              {reviewCount > 0 && (
                  <button onClick={() => navigate(`/discourse/10/review`)} className="flex-1 py-2 bg-orange-50 text-orange-600 rounded-xl text-xs font-black shadow-sm border border-orange-200 flex items-center justify-center gap-1">
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
             onClick={() => navigate('/discourse/10/review')}
             className="relative flex flex-col items-start p-4 bg-orange-50 border border-orange-200 hover:border-orange-400 active:scale-95 rounded-2xl transition-all shadow-sm"
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
             onClick={() => navigate(`/discourse/${size}/normal`)}
             className="flex flex-col items-start p-4 bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50 rounded-2xl transition-all shadow-sm active:scale-95"
          >
            <span className="font-black text-slate-800">
                {size === 5 ? 'Saio azkarra' : size === 10 ? 'Entrenamendua' : 'Erronka'}
            </span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{size} galdera</span>
          </button>
        ))}

        <button
           disabled={!isAdituaUnlocked}
           onClick={() => isAdituaUnlocked && navigate('/discourse/10/aditua')}
           className={`flex flex-col items-start p-4 rounded-2xl transition-all shadow-sm border ${
             isAdituaUnlocked
                ? "bg-emerald-50 border-emerald-200 hover:border-emerald-400 active:scale-95"
                : "bg-slate-50 border-slate-100 opacity-70"
           }`}
        >
            <span className={`font-black ${isAdituaUnlocked ? "text-emerald-800" : "text-slate-400"}`}>Aditu modua</span>
            <span className={`text-xs font-bold uppercase tracking-wider ${isAdituaUnlocked ? "text-emerald-600" : "text-slate-400"}`}>
                {isAdituaUnlocked ? '10 galdera aurreratu' : 'Maila altuagoetan desblokeatuko da'}
            </span>
        </button>
      </div>

      <button onClick={() => navigate('/stats')} className="w-full mt-4 flex items-center justify-center gap-2 p-4 bg-slate-100 text-slate-700 font-black rounded-2xl hover:bg-slate-200 transition-colors">
          <BarChart2 size={20} />
          Estatistikak ikusi
      </button>
    </div>
  );
}
