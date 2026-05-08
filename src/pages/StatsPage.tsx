import { useState, useEffect } from 'react';
import { ArrowLeft, Award, Target, Star, ChevronRight, CheckCircle2 } from 'lucide-react';
import { playerService } from '../services/playerService';
import { discourseClozeDiagnosisService, getDiscourseFunctionLabelEu } from '../services/discourseClozeDiagnosisService';
import { fetchGameData } from '../services/lexicalService';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { usePlayerProfile } from '../hooks/usePlayerProfile';

export default function StatsPage() {
  const navigate = useNavigate();
  const [showRequirements, setShowRequirements] = useState(false);
  const [synonymsPerLevel, setSynonymsPerLevel] = useState<Record<string, number>>({});
  
  const profile = usePlayerProfile();
  const mastery = playerService.getMasteryCounts();

  useEffect(() => {
    fetchGameData().then(groups => {
      const counts: Record<string, number> = {};
      groups.forEach(group => {
        const level = group.reviewed_level || 'B1';
        counts[level] = (counts[level] || 0) + group.words.length;
      });
      setSynonymsPerLevel(counts);
    });
  }, []);
  const wordMastery = playerService.getWordMasteryCounts();
  const progress = playerService.calculateLevelProgress(profile);
  const discourseStats = playerService.getDiscourseClozeStats(profile);
  
  const accuracy = profile.stats.globalAccuracy ? Math.round(profile.stats.globalAccuracy) : 0;

  const reqQuestions = progress.missingRequirements.find(r => r.label === 'Galderak')?.isMet;
  const reqAccuracy = progress.missingRequirements.find(r => r.label === 'Akurazia')?.isMet;
  const reqReview = progress.missingRequirements.find(r => r.label === 'Berrikusteko')?.isMet;
  const reqMastery = progress.missingRequirements.find(r => r.label === 'Ezagutza')?.isMet;
  const knowledgeGap = reqQuestions && reqAccuracy && reqReview && !reqMastery;

  return (
    <div className="flex flex-col space-y-8 py-2">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/')} className="p-3 bg-slate-100/50 hover:bg-slate-100 rounded-2xl transition-colors">
          <ArrowLeft size={20} />
        </button>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Estatistikak</span>
        <div className="w-10"></div> {/* spacer */}
      </div>

      {/* Progress Card */}
      <div className="card p-8 bg-slate-900 border-none space-y-6 relative overflow-hidden shadow-xl shadow-slate-200">
        <div className="flex justify-between items-start relative z-10 text-white">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Uneko maila</span>
            <h3 className="text-4xl font-black">{profile.currentLevel}</h3>
          </div>
          <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/5">
            <Award size={28} className="text-emerald-400" />
          </div>
        </div>

        <div className="space-y-3 relative z-10">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
            <span>Aurrerapena</span>
            <span>{progress.totalProgress}%</span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress.totalProgress}%` }}
              className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]"
            />
          </div>
          {knowledgeGap && (
            <p className="text-[10px] font-bold text-emerald-400 text-center animate-pulse pt-1">
              Ia prest zaude: talde batzuk gehiago sendotu behar dituzu.
            </p>
          )}
        </div>
        
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]"></div>
      </div>

      {/* Words Summary */}
      <div className="space-y-4">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">Hitzak</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center space-y-1 shadow-sm">
            <span className="text-lg font-black text-slate-800">{wordMastery.mastered}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Menperatuta</span>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center space-y-1 shadow-sm">
            <span className="text-lg font-black text-slate-800">{wordMastery.known}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Ezagunak</span>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center space-y-1 shadow-sm">
            <span className="text-lg font-black text-slate-800">{wordMastery.reviewing + wordMastery.learning}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Ikasten</span>
          </div>
        </div>
      </div>

      {/* Groups Summary */}
      <div className="space-y-4">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">Taldeak</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center space-y-1 shadow-sm">
            <span className="text-lg font-black text-slate-800">{mastery.mastered}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Menperatuta</span>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center space-y-1 shadow-sm">
            <span className="text-lg font-black text-slate-800">{mastery.known}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Ezagunak</span>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center space-y-1 shadow-sm">
            <span className="text-lg font-black text-slate-800">{mastery.reviewing + mastery.learning}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Ikasten</span>
          </div>
        </div>
      </div>

      {/* Antolatzaileak Summary */}
      <div className="space-y-4">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">Antolatzaileak</h3>
        
        {discourseStats.totalSessions === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center space-y-2 shadow-sm">
             <p className="font-bold text-slate-700">Oraindik ez duzu saiorik jokatu.</p>
             <p className="text-sm text-slate-500">Jokatu lehen saioa estatistikak biltzen hasteko.</p>
          </div>
        ) : (
          <>
            {/* Diagnosis Card */}
            {(() => {
                const diagnosis = discourseClozeDiagnosisService.getDiscourseDiagnosis(discourseStats);
                const statusColor = diagnosis.globalStatus === 'excellent' || diagnosis.globalStatus === 'strong' ? 'text-emerald-700' :
                                    diagnosis.globalStatus === 'needs_reinforcement' ? 'text-amber-700' : 'text-sky-700';
                const statusBg = diagnosis.globalStatus === 'excellent' || diagnosis.globalStatus === 'strong' ? 'bg-emerald-50 border-emerald-100' :
                                 diagnosis.globalStatus === 'needs_reinforcement' ? 'bg-amber-50 border-amber-100' : 'bg-sky-50 border-sky-100';

                return (
                    <div className={`rounded-2xl border p-5 space-y-3 ${statusBg}`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${statusColor} opacity-70`}>Diagnostikoa</p>
                        <p className={`font-black text-lg ${statusColor}`}>{diagnosis.mainMessageEu}</p>
                        {diagnosis.secondaryMessageEu && (
                           <p className={`text-sm ${statusColor} opacity-90`}>{diagnosis.secondaryMessageEu}</p>
                        )}
                        
                        {diagnosis.weakestFunctions.length > 0 && (
                            <div className="pt-3 space-y-2">
                                <p className={`text-xs font-bold ${statusColor} opacity-80 uppercase tracking-widest`}>Indartu beharreko arloak:</p>
                                <div className="flex flex-wrap gap-2">
                                    {diagnosis.weakestFunctions.map(f => (
                                        <span key={f.functionCode} className="px-2 py-1 bg-white rounded-lg text-xs font-bold text-slate-700 shadow-sm">
                                            {f.labelEu}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {!diagnosis.weakestFunctions.length && diagnosis.globalStatus !== 'starting' && diagnosis.globalStatus !== 'no_data' && (
                            <div className="pt-3">
                                <p className={`text-sm ${statusColor} opacity-90 italic`}>Ez dago bereziki ahul ageri den funtziorik.</p>
                            </div>
                        )}
                    </div>
                );
            })()}

            <div className="grid grid-cols-2 gap-3">
               <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center space-y-1 shadow-sm">
                  <span className="text-lg font-black text-slate-800">{discourseStats.totalSessions}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Saioak</span>
               </div>
               <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center space-y-1 shadow-sm">
                  <span className="text-lg font-black text-slate-800">{Math.round(discourseStats.accuracy * 100)}%</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Asmatze tasa</span>
               </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
               <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center space-y-1 shadow-sm">
                  <span className="text-lg font-black text-slate-800">{discourseStats.masterySummary.mastered}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Menderatuta</span>
               </div>
               <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center space-y-1 shadow-sm">
                  <span className="text-lg font-black text-slate-800">{discourseStats.masterySummary.known}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Ezagunak</span>
               </div>
               <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center space-y-1 shadow-sm">
                  <span className="text-lg font-black text-slate-800">{discourseStats.masterySummary.reviewing + discourseStats.masterySummary.learning}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Ikasten</span>
               </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Funtzio diskurtsiboak ({Object.keys(discourseStats.byDiscursiveFunction).length})</h4>
               <div className="space-y-3 pt-2">
                   {Object.entries(discourseStats.byDiscursiveFunction).map(([func, stats]) => {
                       const statusColor = stats.accuracy >= 0.9 ? "text-emerald-500" : stats.accuracy >= 0.8 ? "text-sky-500" : stats.accuracy >= 0.6 ? "text-amber-500" : "text-red-500";
                       const statusBg = stats.accuracy >= 0.9 ? "bg-emerald-50 border-emerald-100" : stats.accuracy >= 0.8 ? "bg-sky-50 border-sky-100" : stats.accuracy >= 0.6 ? "bg-amber-50 border-amber-100" : "bg-red-50 border-red-100";
                       const label = stats.accuracy >= 0.9 ? "Bikain" : stats.accuracy >= 0.8 ? "Ondo" : stats.accuracy >= 0.6 ? "Bidean" : "Indartu beharra";
                       
                       return (
                           <div key={func} className={`flex items-center justify-between p-3 rounded-xl border ${statusBg}`}>
                               <div className="flex flex-col">
                                    <span className="font-bold text-slate-700">{getDiscourseFunctionLabelEu(func)}</span>
                                   <span className={`text-[10px] font-black uppercase tracking-wider mt-0.5 ${statusColor}`}>{label}</span>
                               </div>
                               <div className="flex flex-col items-end">
                                   <span className="font-black text-slate-800">{Math.round(stats.accuracy * 100)}%</span>
                                   <span className="text-[10px] font-bold text-slate-500">{stats.correct}/{stats.total} zuzen</span>
                               </div>
                           </div>
                       );
                   })}
               </div>
            </div>
          </>
        )}
      </div>

      {/* Levels Summary */}
      <div className="space-y-4">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">Mailak eta sinonimoak</h3>
        <div className="grid grid-cols-2 gap-3">
          {['B1', 'B2', 'C1', 'C2', 'Aditua'].map(level => (
            <div key={level} className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center space-y-1 shadow-sm">
                <span className="text-lg font-black text-slate-800">{synonymsPerLevel[level] || 0}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{level}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sessions Card */}
      <div className="space-y-4">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">Saioak</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="card p-5 bg-white space-y-3">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Target size={18} />
                </div>
                <span className="text-2xl font-black text-slate-800">{accuracy}%</span>
             </div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Akurazia</span>
          </div>
          <div className="card p-5 bg-white space-y-3">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                  <Star size={18} />
                </div>
                <span className="text-2xl font-black text-slate-800">{profile.stats.currentStreak}</span>
             </div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bolada</span>
          </div>
        </div>
      </div>

      {/* Requirements Section */}
      <div className="pb-8">
        <button 
          onClick={() => setShowRequirements(!showRequirements)}
          className="w-full card p-4 bg-slate-50 border-slate-100 flex items-center justify-between transition-all"
        >
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mailaz igotzeko baldintzak</span>
          <ChevronRight size={16} className={cn("text-slate-400 transition-all", showRequirements ? "rotate-90" : "")} />
        </button>
        
        <AnimatePresence>
          {showRequirements && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-white border-x border-b border-slate-100 rounded-b-3xl px-6 py-4 divide-y divide-slate-50"
            >
              {progress.missingRequirements.map((req, i) => (
                <div key={i} className="py-3 flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-500">{req.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-slate-700">{req.current} <span className="text-slate-300 font-medium">/</span> {req.target}</span>
                    {req.isMet ? (
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-100" />
                    )}
                  </div>
                </div>
              ))}
              {!progress.missingRequirements.find(r => r.label === 'Ezagutza')?.isMet && (
                <div className="py-3 text-xs font-semibold text-center text-indigo-500 bg-indigo-50 rounded-xl mt-2">
                  Hitzak eta taldeak sendotu behar dituzu.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
