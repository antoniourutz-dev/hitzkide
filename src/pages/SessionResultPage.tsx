import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Award, RefreshCw, Home, BookOpen, ChevronRight } from 'lucide-react';
import { SessionResult, MasteryStatus } from '../types/stats';
import { playerService } from '../services/playerService';
import { useNavigate } from 'react-router-dom';

interface SessionResultPageProps {
  onToast?: (message: string, type?: 'success' | 'info' | 'warning' | 'achievement') => void;
}

const STATUS_LABELS: Record<MasteryStatus, string> = {
  new: 'Berria',
  seen: 'Ikusita',
  learning: 'Ikasten',
  reviewing: 'Berrikasten',
  known: 'Ezaguna',
  mastered: 'Menderatuta'
};

export default function SessionResultPage({ onToast: _onToast }: SessionResultPageProps) {
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);
  const [result, setResult] = useState<SessionResult | null>(null);
  const hasProcessed = useRef(false);
  const progress = playerService.calculateLevelProgress();

  useEffect(() => {
    if (hasProcessed.current) return;
    
    const stored = sessionStorage.getItem('hitzkideak_result');
    if (stored) {
      hasProcessed.current = true;
      const data = JSON.parse(stored);
      const { score, answers, questions, mode } = data;
      const processedResult = playerService.updateSession(score, questions, answers, mode);
      setResult(processedResult);
      sessionStorage.removeItem('hitzkideak_result');
      sessionStorage.removeItem('hitzkideak_questions');
    } else {
      navigate('/');
    }
  }, [navigate]);

  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const percentage = Math.round((result.score / result.total) * 100);

  const getMessage = (s: number, t: number) => {
    const p = s / t;
    if (p === 1) return "Bikain!";
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
          <svg className="w-32 h-32 -rotate-90">
            <circle cx="64" cy="64" r="58" fill="none" stroke="#f1f5f9" strokeWidth="8" />
            <circle
              cx="64" cy="64" r="58" fill="none"
              stroke={percentage === 100 ? '#10b981' : percentage >= 60 ? '#f59e0b' : '#ef4444'}
              strokeWidth="8"
              strokeDasharray={`${(percentage / 100) * 364.4} 364.4`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-black text-slate-800">{percentage}%</span>
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{getMessage(result.score, result.total)}</h2>
          <p className="text-slate-500 font-medium">{result.score}/{result.total} zuzen</p>
          <p className="text-slate-400 text-xs font-medium">{getSubMessage(result.mode, result.total)}</p>
        </div>
      </div>

      {result.statusChanges.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Aldaketak</h3>
          <div className="space-y-2">
            {result.statusChanges.map((change, idx) => (
              <motion.div
                key={`${change.groupId}-${idx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    change.newStatus === 'mastered' ? 'bg-emerald-100 text-emerald-600' :
                    change.newStatus === 'known' ? 'bg-blue-100 text-blue-600' :
                    change.newStatus === 'learning' ? 'bg-amber-100 text-amber-600' :
                    'bg-slate-100 text-slate-400'
                  }`}>
                    {change.newStatus === 'mastered' ? <Award size={16} /> :
                     change.newStatus === 'known' ? <CheckCircle2 size={16} /> :
                     change.newStatus === 'learning' ? <RefreshCw size={16} /> :
                     <BookOpen size={16} />}
                  </div>
                  <span className="text-sm font-bold text-slate-700">{change.concept}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-slate-400">{STATUS_LABELS[change.oldStatus]}</span>
                  <ChevronRight size={12} className="text-slate-300" />
                  <span className="text-emerald-600 font-black">{STATUS_LABELS[change.newStatus]}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/')}
          className="flex items-center justify-center gap-2 py-4 bg-emerald-500 text-white rounded-2xl font-bold tracking-wide active:scale-95 transition-all shadow-md shadow-emerald-200"
        >
          <Home size={18} />
          Hasiera
        </button>
        <button
          onClick={() => navigate('/review')}
          className="flex items-center justify-center gap-2 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold tracking-wide active:scale-95 transition-all"
        >
          <RefreshCw size={18} />
          Errepasoa
        </button>
      </div>

      <AnimatePresence>
        {knowledgeGap && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-amber-50 border border-amber-100 rounded-2xl space-y-2"
          >
            <h4 className="text-sm font-black text-amber-800">Ez gertu zaude oraingoz?</h4>
            <p className="text-xs text-amber-700 leading-relaxed">
              Hurrengo mailara igotzeko, galdera gehiago egin behar dituzu zure oraingo mailan. Jarraitu praktikatzen!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-emerald-500 transition-colors"
      >
        {showDetails ? 'Ezkutatu' : 'Erakutsi'} xehetasunak
      </button>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {result.answers.map((answer, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 text-sm">
                <span className="text-slate-700">{answer.correctAnswer}</span>
                <span className={`font-black text-xs ${answer.isCorrect ? 'text-emerald-600' : 'text-red-500'}`}>
                  {answer.isCorrect ? 'ZUZEN' : 'OKERRA'}
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
