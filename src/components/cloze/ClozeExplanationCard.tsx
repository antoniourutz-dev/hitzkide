import { useState } from 'react';
import { cn } from '../../lib/utils';
import { LexicalClozeQuestion } from '../../types/cloze';
import { LanguagePreference } from '../../hooks/useLanguagePreference';
import { ChevronDown, ChevronUp, AlertCircle, Lightbulb } from 'lucide-react';
import { clozeService } from '../../services/clozeService';

interface ClozeExplanationCardProps {
  question: LexicalClozeQuestion;
  isCorrect: boolean;
  languagePreference: LanguagePreference;
  onNext: () => void;
}

export default function ClozeExplanationCard({ question, isCorrect, languagePreference, onNext }: ClozeExplanationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const explanationData = clozeService.getClozeExplanation(question, languagePreference);

  return (
    <div className={cn("p-6 rounded-3xl border-2 space-y-4", isCorrect ? "bg-emerald-50 border-emerald-500" : "bg-red-50 border-red-500")}>
      <h3 className={cn("text-lg font-black uppercase tracking-widest", isCorrect ? "text-emerald-700" : "text-red-700")}>
        {isCorrect ? 'Zuzen!' : 'Oker!'}
      </h3>
      
      {!isCorrect && (
          <p className="text-sm font-bold text-slate-700">Erantzun zuzena: <span className="font-black text-emerald-600">{question.answer}</span></p>
      )}

      {/* Render explanations based on languagePreference */}
      {explanationData.eu && (
        <div className="space-y-2">
            <p className="text-slate-700">{explanationData.eu.explanation}</p>
        </div>
      )}

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs font-black text-slate-500 uppercase flex items-center gap-1"
      >
        {isExpanded ? 'Ezkutatu' : 'Azalpen osoa ikusi'}
        {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
      </button>

      {isExpanded && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
           {explanationData.eu?.nuance && <p className="text-sm text-slate-600"><strong>Ñabardura:</strong> {explanationData.eu.nuance}</p>}
           {explanationData.eu?.whyNot && <p className="text-sm text-slate-600"><strong>Zergatik ez?:</strong> {explanationData.eu.whyNot}</p>}
        </div>
      )}

      <button onClick={onNext} className="w-full h-12 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest">
        Hurrengoa
      </button>
    </div>
  );
}
