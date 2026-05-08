import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Award, RefreshCw, Home, BookOpen, ChevronRight } from 'lucide-react';
import { SessionResult, MasteryStatus } from '../types/stats';
import { playerService } from '../services/playerService';
import { useNavigate } from 'react-router-dom';
import {
  SESSION_STORAGE_KEYS,
  readJsonFromSessionStorage,
  removeSessionStorageItem,
} from '../lib/storage';
import { getConceptLabel } from '../utils/labels';

interface SessionResultPageProps {
  onToast?: (message: string, type?: 'success' | 'info' | 'warning' | 'achievement') => void;
}

type StoredResultPayload = {
  score: number;
  answers: SessionResult['answers'];
  questions: SessionResult['questions'];
  mode?: string;
};

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
  const [storedResult, setStoredResult] = useState<StoredResultPayload | null>(null);
  const [isPersisting, setIsPersisting] = useState(false);
  const [syncError, setSyncError] = useState<'auth_required' | 'sync_failed' | null>(null);
  const hasProcessed = useRef(false);

  const persistStoredResult = useCallback(async (payload: StoredResultPayload) => {
    if (hasProcessed.current) return;

    hasProcessed.current = true;
    setIsPersisting(true);
    setSyncError(null);

    try {
      const processedResult = await playerService.finalizeSession(
        payload.score,
        payload.questions,
        payload.answers,
        payload.mode
      );
      setResult(processedResult);
      removeSessionStorageItem(SESSION_STORAGE_KEYS.result);
      removeSessionStorageItem(SESSION_STORAGE_KEYS.questions);
    } catch (error) {
      hasProcessed.current = false;
      setSyncError(error instanceof Error && error.message === 'auth_required' ? 'auth_required' : 'sync_failed');
    } finally {
      setIsPersisting(false);
    }
  }, []);

  useEffect(() => {
    const stored = readJsonFromSessionStorage<StoredResultPayload>(SESSION_STORAGE_KEYS.result);

    if (stored) {
      setStoredResult(stored);
    } else {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    if (!storedResult || result || isPersisting || hasProcessed.current) {
      return;
    }

    void persistStoredResult(storedResult);
  }, [isPersisting, persistStoredResult, result, storedResult]);

  if (!result && syncError) {
    return (
      <div className="p-6 space-y-5">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Sinkronizazioa behar da</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed">
            {syncError === 'auth_required'
              ? 'Saioa berriro hasi behar duzu partida hau Supabasen gordetzeko.'
              : 'Ezin izan dugu partida hau Supabasen gorde. Saiatu berriro konexioa egonkorra denean.'}
          </p>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => storedResult && void persistStoredResult(storedResult)}
            className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black"
          >
            Berriro saiatu
          </button>
          {syncError === 'auth_required' && (
            <button
              onClick={() => navigate('/profile')}
              className="w-full py-4 bg-sky-50 text-sky-700 rounded-2xl font-black border border-sky-200"
            >
              Saioa hasi
            </button>
          )}
          <button
            onClick={() => navigate('/')}
            className="w-full py-4 bg-slate-100 text-slate-700 rounded-2xl font-black"
          >
            Hasierara itzuli
          </button>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Supabasen gordetzen</p>
        </div>
      </div>
    );
  }

  const progress = playerService.calculateLevelProgress();
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
                  <span className="text-sm font-bold text-slate-700">{getConceptLabel(change.concept)}</span>
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
