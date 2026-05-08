import { useState } from 'react';
import { cn } from '../../lib/utils';
import { LexicalClozeQuestion } from '../../types/cloze';
import { LanguagePreference } from '../../hooks/useLanguagePreference';
import { ChevronDown, ChevronUp } from 'lucide-react';
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
  const explanationSections = [
    explanationData.eu
      ? {
          key: 'eu',
          title: languagePreference === 'both' ? 'Euskaraz' : null,
          labels: { nuance: 'Ñabardura', whyNot: 'Zergatik ez?' },
          ...explanationData.eu
        }
      : null,
    explanationData.es
      ? {
          key: 'es',
          title: languagePreference === 'both' ? 'Gaztelaniaz' : null,
          labels: { nuance: 'Matiz', whyNot: 'Por que no?' },
          ...explanationData.es
        }
      : null
  ].filter((section): section is NonNullable<typeof section> => section !== null);

  return (
    <div
      className={cn(
        "sleek-card p-6 space-y-4",
        isCorrect ? "bg-emerald-50" : "bg-rose-50"
      )}
    >
      <h3 className={cn("text-lg font-black uppercase tracking-widest", isCorrect ? "text-emerald-800" : "text-rose-800")}>
        {isCorrect ? 'Zuzen!' : 'Oker!'}
      </h3>
      
      {!isCorrect && (
          <p className="text-sm font-bold text-slate-800">
            Erantzun zuzena: <span className="font-black text-emerald-700">{question.answer}</span>
          </p>
      )}

      <div className="space-y-4">
        {explanationSections.map((section, index) => (
          <div
            key={section.key}
            className={cn(index > 0 && "border-t-[3px] border-brand-border pt-4")}
          >
            {section.title && (
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                {section.title}
              </p>
            )}
            {section.explanation && (
              <p className="text-slate-800">{section.explanation}</p>
            )}

            {isExpanded && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 mt-3">
                {section.nuance && (
                  <p className="text-sm text-slate-700">
                    <strong>{section.labels.nuance}:</strong> {section.nuance}
                  </p>
                )}
                {section.whyNot && (
                  <p className="text-sm text-slate-700">
                    <strong>{section.labels.whyNot}:</strong> {section.whyNot}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs font-black text-slate-700 uppercase flex items-center gap-2"
      >
        {isExpanded ? 'Ezkutatu' : 'Azalpen osoa ikusi'}
        {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
      </button>

      <button onClick={onNext} className="w-full sleek-btn-primary bg-slate-900">
        Hurrengoa
      </button>
    </div>
  );
}
