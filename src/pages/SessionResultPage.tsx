import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Award, RefreshCw, Home, BookOpen, Star, ChevronRight } from 'lucide-react';
import { SessionResult, MasteryStatus } from '../types/stats';
import { playerService } from '../services/playerService';

interface SessionResultPageProps {
  result: SessionResult;
  onPlayAgain: () => void;
  onReview: () => void;
  onHome: () => void;
}

const STATUS_LABELS: Record<MasteryStatus, string> = {
  new: 'Berria',
  seen: 'Ikusita',
  learning: 'Ikasten',
  reviewing: 'Berrikasten',
  known: 'Ezaguna',
  mastered: 'Menderatuta'
};

const STATUS_ICONS: Record<MasteryStatus, any> = {
  new: BookOpen,
  seen: BookOpen,
  learning: BookOpen,
  reviewing: RefreshCw,
  known: CheckCircle2,
  mastered: Award
};

export default function SessionResultPage({ result, onPlayAgain, onReview, onHome }: SessionResultPageProps) {
  const [showDetails, setShowDetails] = useState(false);
  const percentage = Math.round((result.score / result.total) * 100);
  const profile = playerService.getProfile();
  const progress = playerService.calculateLevelProgress();

  const getMessage = (s: number, t: number) => {
    const p = s / t;
    if (p === 1) return "Bikain! 🎉";
    if (p >= 0.8) return "Oso ondo!";
    if (p >= 0.6) return "Ondo!";
    return "Jarraitu praktikatzen!";
  };

  const getSubMessage = (mode?: string, total: number = 0) => {
    if (mode === 'review') return `${total} hitz errepasatu dituzu`;
    return `${total} hitz landu dituzu`;
  };

  const reqQuestions = progress.missingRequirements.find(r => r.label === 'Galderak')?.isMet;
  const reqAccuracy = progress.missingRequirements.find(r => r.label === 'Akurazia')?.isMet;
  const reqReview = progress.missingRequirements.find(r => r.label === 'Berrikusteko')?.isMet;
  const reqMastery = progress.missingRequirements.find(r => r.label === 'Ezagutza')?.isMet;
  const knowledgeGap = reqQuestions && reqAccuracy && reqReview && !reqMastery;

  return (
    <div className="flex flex-col space-y-10 py-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-4">
        <div className="relative inline-block">
          <motion.div 
            initial={{ scale: 0.5, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            className="w-40 h-40 rounded-[3rem] bg-emerald-500 shadow-2xl shadow-emerald-200 flex flex-col items-center justify-center text-white"
          >
            <span className="text-5xl font-black">{result.score} / {result.total}</span>
          </motion.div>
          {percentage === 100 && (
            <motion.div 
              initial={{ scale: 0, bounce: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute -top-4 -right-4 bg-amber-400 text-white p-3 rounded-2xl shadow-xl border-4 border-white"
            >
              <Star fill="currentColor" size={28} />
            </motion.div>
          )}
        </div>
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter">{getMessage(result.score, result.total)}</h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest leading-none">{getSubMessage(result.mode, result.total)}</p>
        </div>
      </div>

      {/* Progress Section */}
      <div className="card p-8 bg-white border-slate-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center px-1">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{profile.currentLevel} mailara bidean</span>
           <span className="text-sm font-black text-slate-800">{progress.totalProgress}%</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress.totalProgress}%` }}
            className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.2)] transition-all duration-1000"
          />
        </div>
        {knowledgeGap && !progress.isCompensated && (
           <p className="text-[11px] font-bold text-emerald-600 text-center pt-1 animate-pulse">
             Ezagutza sendotzen ari zara.
           </p>
        )}
        {progress.isCompensated && (
           <p className="text-[11px] font-bold text-amber-600 text-center pt-1">
             Akurazia handiak lagundu dizu mailaz igotzen.
           </p>
        )}
        
        {result.statusChanges.length > 0 ? (
          <div className="pt-2 flex flex-col gap-2">
            {result.statusChanges.slice(0, 2).map((change, i) => (
              <div key={i} className="flex items-center gap-2 bg-emerald-50/50 p-2 rounded-xl border border-emerald-100/50">
                <div className="p-1.5 bg-white rounded-lg text-emerald-500 shadow-sm">
                   <CheckCircle2 size={14} />
                </div>
                  {change.newStatus === 'known' && change.oldStatus !== 'mastered' ? (
                    <span className="text-[11px] font-bold text-emerald-700">Talde bat ezagun bihurtu da ({change.concept})</span>
                  ) : change.newStatus === 'mastered' ? (
                    <span className="text-[11px] font-bold text-emerald-700">Talde bat menperatu duzu ({change.concept})</span>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-700">+{change.concept} <span className="opacity-60">{STATUS_LABELS[change.newStatus]}</span></span>
                  )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center pt-2">
            Errepasoa sendotu duzu
          </p>
        )}

        <div className="pt-2">
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-emerald-500 transition-colors flex items-center justify-center gap-1"
          >
            Xehetasunak ikusi
            <motion.div animate={{ rotate: showDetails ? 180 : 0 }}>
              <ChevronRight size={12} className="rotate-90" />
            </motion.div>
          </button>
          
          <AnimatePresence>
            {showDetails && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-slate-50 rounded-2xl mt-4 p-4 space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Zuzenak</span>
                    <span className="text-xl font-black text-emerald-600">{result.score}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Hutsak</span>
                    <span className="text-xl font-black text-red-500">{result.total - result.score}</span>
                  </div>
                </div>
                <div className="space-y-1">
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block px-1">Lantutako hitzak</span>
                   <div className="flex flex-wrap gap-2 pt-1">
                      {result.questions.map((q, i) => (
                        <span key={i} className="px-2 py-1 bg-white border border-slate-100 rounded-lg text-[10px] font-bold text-slate-600">
                          {q.promptWord.word}
                        </span>
                      ))}
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-4">
        <button
          onClick={onPlayAgain}
          className="w-full h-18 bg-emerald-500 text-white rounded-[2rem] font-black text-lg flex items-center justify-center space-x-3 shadow-xl shadow-emerald-100 active:scale-95 transition-all"
        >
          <RefreshCw size={24} />
          <span>Beste saio bat jokatu</span>
        </button>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onReview}
            className="h-16 bg-blue-50 border border-blue-100 text-blue-700 rounded-2xl font-black text-sm flex items-center justify-center space-x-2 active:scale-95 transition-all"
          >
            <BookOpen size={20} />
            <span>Errepasoa egin</span>
          </button>
          <button
            onClick={onHome}
            className="h-16 bg-slate-50 border border-slate-200 text-slate-600 rounded-2xl font-black text-sm flex items-center justify-center space-x-2 active:scale-95 transition-all"
          >
            <Home size={20} />
            <span>Hasierara itzuli</span>
          </button>
        </div>
      </div>
    </div>
  );
}
