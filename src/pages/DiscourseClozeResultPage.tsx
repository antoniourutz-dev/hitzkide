import { useState, useEffect } from 'react';
import { DiscourseClozeSession } from '../types/discourseCloze';
import { getDiscourseFunctionLabelEu, getFunctionRecommendationEu } from '../services/discourseClozeDiagnosisService';
import { useNavigate } from 'react-router-dom';
import { SESSION_STORAGE_KEYS, readJsonFromSessionStorage } from '../lib/storage';

export default function DiscourseClozeResultPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<DiscourseClozeSession | null>(null);

  useEffect(() => {
    const stored = readJsonFromSessionStorage<DiscourseClozeSession>(SESSION_STORAGE_KEYS.discourseResult);
    if (stored) {
      setSession(stored);
    } else {
      navigate('/');
    }
  }, [navigate]);

  if (!session) {
    return <div className="py-10 text-slate-600 font-medium">Kargatzen...</div>;
  }

  const percentage = Math.round((session.score / session.total) * 100);
  const failedAnswers = session.answers.filter(a => !a.isCorrect);
  const correctAnswers = session.answers.filter(a => a.isCorrect);

  const functionFailures: Record<string, number> = {};
  failedAnswers.forEach(a => {
      const q = session.questions.find(x => x.id === a.questionId);
      const f = q?.discursive_function || 'besterik';
      functionFailures[f] = (functionFailures[f] || 0) + 1;
  });

  const functionSuccesses: Record<string, number> = {};
  correctAnswers.forEach(a => {
      const q = session.questions.find(x => x.id === a.questionId);
      const f = q?.discursive_function || 'besterik';
      functionSuccesses[f] = (functionSuccesses[f] || 0) + 1;
  });

  let worstFunction = '';
  let maxFailures = 0;
  for (const [func, count] of Object.entries(functionFailures)) {
      if (count > maxFailures && func !== 'besterik') {
          maxFailures = count;
          worstFunction = func;
      }
  }

  let bestFunction = '';
  let maxSuccesses = 0;
  for (const [func, count] of Object.entries(functionSuccesses)) {
      if (count > maxSuccesses && func !== 'besterik') {
          maxSuccesses = count;
          bestFunction = func;
      }
  }

  let didacticMessage = '';
  if (maxFailures >= 2 && worstFunction) {
      didacticMessage = getFunctionRecommendationEu(worstFunction);
  } else if (percentage >= 80) {
      didacticMessage = 'Oso ondo: funtzio diskurtsiboak argi bereizten ari zara.';
  } else if (session.total < 5) {
      didacticMessage = 'Saio gehiago jokatu ahala, gomendioak zehatzagoak izango dira.';
  }

  return (
    <div className="space-y-6 pb-20">
      <h2 className="text-2xl font-black text-brand-text tracking-tight">Emaitzak</h2>

      <div className="sleek-card p-6 space-y-2 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 bg-brand-primary rounded-full blur-2xl w-32 h-32 -mr-10 -mt-10 pointer-events-none"></div>
        <p className="text-5xl font-black text-brand-accent">{percentage}%</p>
        <p className="text-sm font-black text-slate-700 uppercase tracking-widest pt-2">Puntuazioa: {session.score} / {session.total}</p>
        <p className="text-sm font-bold text-slate-600 capitalize">Maila: {session.level}</p>
      </div>

      <div className="sleek-card p-6 bg-sky-50 space-y-3">
         <p className="text-[10px] font-black uppercase tracking-widest text-sky-800 opacity-80 mb-2">Saioaren azterketa</p>

         <div className="space-y-2 pb-2">
            {bestFunction && (
               <div className="text-sm flex justify-between">
                   <span className="text-slate-600 font-medium">Egokien erabilia:</span>
                   <span className="font-bold text-emerald-700 capitalize">{getDiscourseFunctionLabelEu(bestFunction)} ({maxSuccesses})</span>
               </div>
            )}
            {worstFunction && (
               <div className="text-sm flex justify-between">
                   <span className="text-slate-600 font-medium">Fallo gehien:</span>
                   <span className="font-bold text-amber-600 capitalize">{getDiscourseFunctionLabelEu(worstFunction)} ({maxFailures})</span>
               </div>
            )}
         </div>

         {didacticMessage && (
            <div className="sleek-card p-4 bg-white">
                <p className="text-sm font-bold text-sky-800">{didacticMessage}</p>
            </div>
         )}
      </div>

      {failedAnswers.length > 0 && (
         <div className="space-y-3 pt-4">
             <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">Akatsak ({failedAnswers.length})</h3>
             <div className="space-y-3">
                 {failedAnswers.map(failed => {
                     const question = session.questions.find(q => q.id === failed.questionId);
                     if (!question) return null;
                     return (
                         <div key={failed.questionId} className="sleek-card p-4 bg-rose-50/60 text-sm space-y-2">
                             <p className="text-slate-700 leading-relaxed">
                                 {question.sentence_with_blank_eu.replace('______', `[${failed.selectedAnswer}]`)}
                             </p>
                             <div className="sleek-card flex flex-col space-y-1 mt-2 p-2 bg-white text-xs">
                                 <span className="text-red-500 line-through font-medium w-full truncate">Zure aukera: {failed.selectedAnswer}</span>
                                 <span className="text-emerald-600 font-bold w-full truncate flex items-center justify-between">
                                     <span>Zuzena: {failed.correctAnswer}</span>
                                     {question.discursive_function && (
                                         <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[9px] font-black uppercase tracking-widest border-[3px] border-brand-border shadow-[2px_2px_0px_0px_#0f172a]">
                                           {getDiscourseFunctionLabelEu(question.discursive_function)}
                                         </span>
                                     )}
                                 </span>
                             </div>
                         </div>
                     );
                 })}
             </div>
         </div>
      )}

      <div className="space-y-3 pt-4">
        <button onClick={() => navigate('/stats')} className="w-full sleek-btn-secondary bg-slate-900 text-white">
            Estatistikak ikusi
        </button>
        <button onClick={() => navigate('/discourse/10/review')} className="w-full sleek-btn-secondary bg-orange-50 text-orange-800">
            Errepasatu
        </button>
        <button onClick={() => navigate('/discourse/5/normal')} className="w-full sleek-btn-primary bg-brand-primary">
            Beste saio bat
        </button>
        <button onClick={() => navigate('/discourse')} className="w-full sleek-btn-secondary">
            Antolatzaileen menua
        </button>
        <button onClick={() => navigate('/')} className="w-full sleek-btn-secondary bg-white">
            Hasierara itzuli
        </button>
      </div>
    </div>
  );
}
