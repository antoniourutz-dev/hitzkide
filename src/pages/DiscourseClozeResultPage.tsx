import { useState, useEffect } from 'react';
import { DiscourseClozeSession } from '../types/discourseCloze';
import { getDiscourseFunctionLabelEu, getFunctionRecommendationEu } from '../services/discourseClozeDiagnosisService';
import { useNavigate } from 'react-router-dom';

export default function DiscourseClozeResultPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<DiscourseClozeSession | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('hitzkideak_discourse_result');
    if (stored) {
      setSession(JSON.parse(stored));
    } else {
      navigate('/');
    }
  }, [navigate]);

  if (!session) {
    return <div className="p-6">Kargatzen...</div>;
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
    <div className="p-6 space-y-6 pb-20">
      <h2 className="text-2xl font-black text-slate-800">Emaitzak</h2>

      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-2 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 bg-sky-500 rounded-full blur-2xl w-32 h-32 -mr-10 -mt-10 pointer-events-none"></div>
        <p className="text-5xl font-black text-sky-600">{percentage}%</p>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest pt-2">Puntuazioa: {session.score} / {session.total}</p>
        <p className="text-sm font-bold text-slate-400 capitalize">Maila: {session.level}</p>
      </div>

      <div className="bg-sky-50 rounded-3xl border border-sky-100 p-6 space-y-3 shadow-sm">
         <p className="text-[10px] font-black uppercase tracking-widest text-sky-600 opacity-80 mb-2">Saioaren azterketa</p>

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
            <div className="bg-white p-4 rounded-xl border border-sky-100 shadow-sm">
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
                         <div key={failed.questionId} className="bg-red-50/50 border border-red-100 rounded-2xl p-4 text-sm space-y-2">
                             <p className="text-slate-700 leading-relaxed">
                                 {question.sentence_with_blank_eu.replace('______', `[${failed.selectedAnswer}]`)}
                             </p>
                             <div className="flex flex-col space-y-1 mt-2 p-2 bg-white rounded-xl text-xs border border-red-50">
                                 <span className="text-red-500 line-through font-medium w-full truncate">Zure aukera: {failed.selectedAnswer}</span>
                                 <span className="text-emerald-600 font-bold w-full truncate flex items-center justify-between">
                                     <span>Zuzena: {failed.correctAnswer}</span>
                                     {question.discursive_function && (
                                         <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[9px] uppercase tracking-wider">{getDiscourseFunctionLabelEu(question.discursive_function)}</span>
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
        <button onClick={() => navigate('/stats')} className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-black transition-colors">
            Estatistikak ikusi
        </button>
        <button onClick={() => navigate('/discourse/10/review')} className="w-full py-4 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 rounded-2xl font-black transition-colors">
            Errepasatu
        </button>
        <button onClick={() => navigate('/discourse/5/normal')} className="w-full py-4 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl font-black transition-colors">
            Beste saio bat
        </button>
        <button onClick={() => navigate('/discourse')} className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black transition-colors">
            Antolatzaileen menua
        </button>
        <button onClick={() => navigate('/')} className="w-full py-4 bg-white border-2 border-slate-100 text-slate-500 font-bold rounded-2xl hover:border-slate-200 hover:text-slate-600 transition-colors">
            Hasierara itzuli
        </button>
      </div>
    </div>
  );
}